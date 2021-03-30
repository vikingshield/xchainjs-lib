import axios from 'axios'
import * as BIP32 from 'bip32'

import { TxHistoryParams } from '@xchainjs/xchain-client'
import * as xchainCrypto from '@xchainjs/xchain-crypto'

import { cosmosclient, rest, cosmos } from 'cosmos-client'
import { Coin, BroadcastTxCommitResult } from 'cosmos-client/openapi/api'

import {
  APIQueryParam,
  SearchTxParams,
  TransferParams,
  TxHistoryResponse,
  CosmosSDKClientParams,
  TxResponse,
  RPCTxSearchResult,
  RPCResponse,
} from './types'
import { getQueryString } from '../util'

export class CosmosSDKClient {
  sdk: cosmosclient.CosmosSDK

  server: string
  chainId: string

  prefix = ''
  derive_path = ''

  // by default, cosmos chain
  constructor({ server, chainId, prefix = 'cosmos', derive_path = "44'/118'/0'/0/0" }: CosmosSDKClientParams) {
    this.server = server
    this.chainId = chainId
    this.prefix = prefix
    this.derive_path = derive_path
    this.sdk = new cosmosclient.CosmosSDK(this.server, this.chainId)
  }

  setPrefix = (): void => {
    cosmosclient.config.bech32Prefix = {
      accAddr: this.prefix,
      accPub: this.prefix + 'pub',
      valAddr: this.prefix + 'valoper',
      valPub: this.prefix + 'valoperpub',
      consAddr: this.prefix + 'valcons',
      consPub: this.prefix + 'valconspub',
    }
  }

  getAddressFromPrivKey = (privkey: cosmosclient.PrivKey): string => {
    this.setPrefix()

    return cosmosclient.AccAddress.fromPublicKey(privkey.pubKey()).toString()
  }

  getPrivKeyFromMnemonic = (mnemonic: string): cosmosclient.PrivKey => {
    const seed = xchainCrypto.getSeed(mnemonic)
    const node = BIP32.fromSeed(seed)
    const child = node.derivePath(this.derive_path)

    if (!child.privateKey) {
      throw new Error('child does not have a privateKey')
    }

    return new cosmosclient.secp256k1.PrivKey({ key: child.privateKey })
  }

  checkAddress = (address: string): boolean => {
    try {
      this.setPrefix()

      if (!address.startsWith(this.prefix)) {
        return false
      }

      return cosmosclient.AccAddress.fromString(address).toString() === address
    } catch (err) {
      return false
    }
  }

  getBalance = async (address: string): Promise<Coin[]> => {
    try {
      this.setPrefix()

      const response = await rest.cosmos.bank
        .allBalances(this.sdk, cosmosclient.AccAddress.fromString(address))
        .then((res) => res.data)

      if (response.balances === undefined) {
        throw new Error('invalid address')
      }
      return response.balances
    } catch (error) {
      return Promise.reject(error)
    }
  }

  searchTx = async ({
    messageAction,
    messageSender,
    page,
    limit,
    txMinHeight,
    txMaxHeight,
  }: SearchTxParams): Promise<TxHistoryResponse> => {
    try {
      const queryParameter: APIQueryParam = {}
      if (messageAction !== undefined) {
        queryParameter['message.action'] = messageAction
      }
      if (messageSender !== undefined) {
        queryParameter['message.sender'] = messageSender
      }
      if (page !== undefined) {
        queryParameter['page'] = page.toString()
      }
      if (limit !== undefined) {
        queryParameter['limit'] = limit.toString()
      }
      if (txMinHeight !== undefined) {
        queryParameter['tx.minheight'] = txMinHeight.toString()
      }
      if (txMaxHeight !== undefined) {
        queryParameter['tx.maxheight'] = txMaxHeight.toString()
      }

      this.setPrefix()

      return await axios
        .get<TxHistoryParams>(`${this.server}/txs?${getQueryString(queryParameter)}`)
        .then((res) => res.data)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  searchTxFromRPC = async ({
    messageAction,
    messageSender,
    transferSender,
    transferRecipient,
    page,
    limit,
    txMinHeight,
    txMaxHeight,
    rpcEndpoint,
  }: SearchTxParams & {
    rpcEndpoint: string
  }): Promise<RPCTxSearchResult> => {
    try {
      const queryParameter: string[] = []
      if (messageAction !== undefined) {
        queryParameter.push(`message.action='${messageAction}'`)
      }
      if (messageSender !== undefined) {
        queryParameter.push(`message.sender='${messageSender}'`)
      }
      if (transferSender !== undefined) {
        queryParameter.push(`transfer.sender='${transferSender}'`)
      }
      if (transferRecipient !== undefined) {
        queryParameter.push(`transfer.recipient='${transferRecipient}'`)
      }
      if (txMinHeight !== undefined) {
        queryParameter.push(`tx.height>='${txMinHeight}'`)
      }
      if (txMaxHeight !== undefined) {
        queryParameter.push(`tx.height<='${txMaxHeight}'`)
      }

      const searchParameter: string[] = []
      searchParameter.push(`query="${queryParameter.join(' AND ')}"`)

      if (page !== undefined) {
        searchParameter.push(`page="${page}"`)
      }
      if (limit !== undefined) {
        searchParameter.push(`per_page="${limit}"`)
      }
      searchParameter.push(`order_by="desc"`)

      const response: RPCResponse<RPCTxSearchResult> = await axios
        .get(`${rpcEndpoint}/tx_search?${searchParameter.join('&')}`)
        .then((res) => res.data)

      return response.result
    } catch (error) {
      return Promise.reject(error)
    }
  }

  txsHashGet = async (hash: string): Promise<TxResponse> => {
    try {
      this.setPrefix()

      return await axios.get<TxResponse>(`${this.server}/txs/${hash}`).then((res) => res.data)
    } catch (error) {
      throw new Error('transaction not found')
    }
  }

  transfer = async ({
    privkey,
    from,
    to,
    amount,
    asset,
    memo = '',
    fee,
  }: TransferParams): Promise<BroadcastTxCommitResult> => {
    try {
      this.setPrefix()

      const msgSend = new cosmos.bank.v1beta1.MsgSend({
        from_address: from,
        to_address: to,
        amount: [
          {
            amount: amount.toString(),
            denom: asset,
          },
        ],
      })

      const txBody = new cosmos.tx.v1beta1.TxBody({
        messages: [cosmosclient.codec.packAny(msgSend)],
        memo,
      })

      return this.signAndBroadcast(txBody, privkey, fee)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  signAndBroadcast = async (
    txBody: cosmos.tx.v1beta1.TxBody,
    privkey: cosmosclient.PrivKey,
    fee: cosmos.tx.v1beta1.IFee = {
      gas_limit: cosmosclient.Long.fromString('200000'),
    },
  ): Promise<BroadcastTxCommitResult> => {
    try {
      this.setPrefix()

      const signer = cosmosclient.AccAddress.fromPublicKey(privkey.pubKey())

      // get account info
      const account = await rest.cosmos.auth
        .account(this.sdk, signer)
        .then((res) => res.data.account && cosmosclient.codec.unpackAny(res.data.account))
        .catch((_) => undefined)

      if (!(account instanceof cosmos.auth.v1beta1.BaseAccount)) {
        throw new Error('invalid address')
      }

      const authInfo = new cosmos.tx.v1beta1.AuthInfo({
        signer_infos: [
          {
            public_key: cosmosclient.codec.packAny(privkey.pubKey()),
            mode_info: {
              single: {
                mode: cosmos.tx.signing.v1beta1.SignMode.SIGN_MODE_DIRECT,
              },
            },
            sequence: account.sequence,
          },
        ],
        fee,
      })

      // sign
      const txBuilder = new cosmosclient.TxBuilder(this.sdk, txBody, authInfo)
      const signDoc = txBuilder.signDoc(account.account_number)
      txBuilder.addSignature(privkey, signDoc)

      const result = await rest.cosmos.tx
        .broadcastTx(this.sdk, {
          tx_bytes: txBuilder.txBytes(),
          mode: rest.cosmos.tx.BroadcastTxMode.Sync,
        })
        .then((res) => res.data)

      if (result.tx_response === undefined) {
        throw new Error('faild to broadcast a transaction')
      }
      return result.tx_response as BroadcastTxCommitResult
    } catch (error) {
      return Promise.reject(error)
    }
  }
}
