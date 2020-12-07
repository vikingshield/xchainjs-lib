import {
  XChainClient,
  XChainClientParams,
  Network,
  Address,
  Fees,
  TxsPage,
  TxHistoryParams,
  Tx,
  TxHash,
  TxParams,
} from '@xchainjs/xchain-client/lib'
import * as xchainCrypto from '@xchainjs/xchain-crypto'
import * as thorDevKit from 'thor-devkit'
import { Balances } from '@xchainjs/xchain-client'
import { LunarApi } from './lunar-api'
import { baseAmount } from '@xchainjs/xchain-util/lib'
import { Operation } from '@lunarhq/rosetta-ts-client'

type VechainClientParams = XChainClientParams & {
  nodeApiKey?: string
}

class Client implements XChainClient {
  lunarClient: LunarApi
  private network: Network
  private phrase = ''
  private address: Address = '' // default address at index 0
  private privateKey: Buffer | null = null // default private key at index 0

  constructor({ network = 'testnet', phrase, nodeApiKey = '' }: VechainClientParams) {
    this.network = network
    this.lunarClient = new LunarApi(nodeApiKey)
    if (phrase) this.setPhrase(phrase)
  }

  purgeClient = (): void => {
    this.phrase = ''
    this.address = ''
    this.privateKey = null
  }

  setNetwork = (network: Network): XChainClient => {
    this.network = network
    this.address = ''
    return this
  }

  getNetwork = (): Network => {
    return this.network
  }

  getExplorerUrl = (): string => {
    return this.network === 'testnet' ? 'https://explore-testnet.vechain.org/' : 'https://explore.vechain.org/'
  }

  getExplorerAddressUrl = (address: Address): string => {
    return `${this.getExplorerUrl()}/accounts/${address}`
  }

  getExplorerTxUrl = (txID: string): string => {
    return `${this.getExplorerUrl()}/transactions/${txID}`
  }

  setPhrase = (phrase: string): Address => {
    if (this.phrase !== phrase) {
      if (!xchainCrypto.validatePhrase(phrase)) {
        throw new Error('Invalid BIP39 phrase')
      }

      this.phrase = phrase
      this.privateKey = null
      this.address = ''
    }

    return this.getAddress()
  }

  private getPrivateKey = (): Buffer => {
    if (!this.privateKey) {
      if (!this.phrase) throw new Error('Phrase not set')
      this.privateKey = thorDevKit.cry.mnemonic.derivePrivateKey(this.phrase.split(' '))
    }

    return this.privateKey
  }

  getAddress = (): string => {
    const privateKey = this.getPrivateKey()
    if (!this.address && privateKey) {
      const pubKey = thorDevKit.cry.secp256k1.derivePublicKey(privateKey)
      const addr = thorDevKit.cry.publicKeyToAddress(pubKey)

      if (!addr) {
        throw new Error('address not defined')
      }

      this.address = `0x${Buffer.from(addr).toString('hex')}`
    }

    return this.address
  }

  validateAddress = (address: Address): boolean => {
    const isAddress = thorDevKit.cry.isAddress(address)
    return isAddress
  }

  getBalance = async (address?: Address): Promise<Balances> => {
    try {
      return await this.lunarClient.getBalance(address || this.getAddress(), this.network)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  // Vechain Rosetta is currently on 1.4.1
  // https://github.com/vechain/rosetta/blob/2ceae31aecd624bbc081bcad0ae1b26c4be19438/src/server/service/transactionService.ts#L111
  // fees are calculated on submit
  getFees = async (): Promise<Fees> => {
    return Promise.resolve({
      type: 'base',
      fast: baseAmount(41250), // average x 1.25
      fastest: baseAmount(49500), // average x 1.5
      average: baseAmount(33000), // based on 3 operations being passed up for a transaction
    })
  }

  getTransactions = async (params?: TxHistoryParams): Promise<TxsPage> => {
    try {
      return await this.lunarClient.getAccountTxs(
        this.network,
        params ?? { address: this.address, offset: 0, limit: 10 },
      )
    } catch (error) {
      console.log('get transactions error: ', error)
      return Promise.reject(error)
    }
  }

  getTransactionData = async (txId: string): Promise<Tx> => {
    try {
      return await this.lunarClient.getTxData(this.network, txId)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  transfer = async ({ amount, recipient, memo }: TxParams): Promise<TxHash> => {
    try {
      const privateKey = this.getPrivateKey()
      const pubKey = thorDevKit.cry.secp256k1.derivePublicKey(privateKey)
      const currency = { symbol: 'VET', decimals: 18 }

      const operations: Operation[] = [
        {
          operation_identifier: { index: 0 },
          type: 'Transfer',
          account: {
            address: this.address,
          },
          amount: {
            value: `-${amount.amount().toString()}`,
            currency: currency,
          },
          status: 'None', // this is required in 1.4.1 but not in later versions
        },
        {
          operation_identifier: { index: 1 },
          type: 'Transfer',
          account: {
            address: recipient,
          },
          amount: {
            value: amount.amount().toString(),
            currency: currency,
          },
          status: 'None', // this is required in 1.4.1 but not in later versions
        },
      ]

      if (memo) {
        // const memoOp: Operation = {
        //   operation_identifier: { index: 2 },
        //   type: 'Transfer',
        //   account: {}
        // }
      }

      const preprocess = await this.lunarClient.constructionPreprocess(this.network, operations)
      const metadataResponse = await this.lunarClient.constructionMetadata(this.network, preprocess)
      const payloadsResponse = await this.lunarClient.constructionPayloads(this.network, metadataResponse, operations)
      const parseUnsignedResponse = await this.lunarClient.constructionParse({
        network: this.network,
        signed: false,
        transaction: payloadsResponse.unsigned_transaction,
      })

      // Ensure parsed response matches operations
      if (parseUnsignedResponse.operations === operations) {
        const combineResponse = await this.lunarClient.constructionCombine({
          network: this.network,
          payloadsRes: payloadsResponse,
          privateKey: privateKey,
          publicKey: pubKey,
        })

        const parseSigned = await this.lunarClient.constructionParse({
          network: this.network,
          signed: true,
          transaction: combineResponse.signed_transaction,
        })

        if (parseSigned.operations === operations) {
          const hashResponse = await this.lunarClient.constructionHash({
            network: this.network,
            signedTx: combineResponse.signed_transaction,
          })

          // SUBMIT
          await this.lunarClient.constructionSubmit({
            network: this.network,
            signedTx: combineResponse.signed_transaction,
          })

          return hashResponse.transaction_identifier.hash
        } else {
          return Promise.reject('Parsed signed operations do not match operations')
        }
      } else {
        return Promise.reject('Parsed unsigned operations do not match operations')
      }
    } catch (error) {
      return Promise.reject(error)
    }
  }
}

export { Client }
