import axios from 'axios'
import {
  BlockIdentifier,
  BlockRequest,
  BlockResponse,
  NetworkIdentifier,
  TransactionIdentifier,
  ConstructionMetadataRequest,
  ConstructionMetadataResponse,
  ConstructionPayloadsRequest,
  ConstructionPayloadsResponse,
  ConstructionPreprocessRequest,
  ConstructionPreprocessResponse,
  RosettaClient,
  Transaction,
  Operation,
  ConstructionParseRequest,
  ConstructionCombineRequest,
  ConstructionHashRequest,
  ConstructionCombineResponse,
  TransactionIdentifierResponse,
  ConstructionSubmitRequest,
  NetworkStatusResponse,
} from '@lunarhq/rosetta-ts-client'
import { Balances, Network, Tx, TxHistoryParams, TxsPage } from '@xchainjs/xchain-client/lib'
import {
  mapToRosettaNetwork,
  mapToRosettaAccountIdentifier,
  mapFromRosettaAccountBalanceResponse,
  mapFromSearchTransactionsToTxsPage,
  mapFromSearchTransactionsToTx,
} from './lunar-utils'
import * as thorDevKit from 'thor-devkit'

type SearchTxParams = {
  network_identifier: NetworkIdentifier
  transaction_identifier?: TransactionIdentifier
  address?: string
  limit?: number
  offset?: number
}

export type SearchTxResponse = {
  transactions: {
    block_identifier: BlockIdentifier
    transaction: Transaction
  }[]
}

export class LunarApi {
  private rosettaClient: RosettaClient
  private nodeApiKey: string

  constructor(nodeApiKey: string) {
    this.nodeApiKey = nodeApiKey
    this.rosettaClient = new RosettaClient({ headers: { 'X-Api-Key': nodeApiKey } })
  }

  getBalance = async (address: string, network: Network): Promise<Balances> => {
    const networkIdentifier = mapToRosettaNetwork(network)
    const accountIdentifier = mapToRosettaAccountIdentifier(address)
    const networkStatusResponse = await this.getNetworkStatus(network)
    const rosettaAccountBalance = await this.rosettaClient.accountBalance({
      account_identifier: accountIdentifier,
      network_identifier: networkIdentifier,
      block_identifier: networkStatusResponse.current_block_identifier,
    })

    const balance = mapFromRosettaAccountBalanceResponse(rosettaAccountBalance)
    return balance
  }

  getNetworkStatus = async (network: Network): Promise<NetworkStatusResponse> => {
    try {
      const body = {
        network_identifier: mapToRosettaNetwork(network),
      }
      return await this.rosettaClient.networkStatus(body)
    } catch (error) {
      throw new Error(error)
    }
  }

  getAccountTxs = async (network: Network, params: TxHistoryParams): Promise<TxsPage> => {
    const networkIdentifier = mapToRosettaNetwork(network)

    const body: SearchTxParams = {
      network_identifier: networkIdentifier,
      address: params.address,
    }

    if (params.limit) {
      body.limit = params.limit
    }

    if (params.offset) {
      body.offset = params.offset
    }

    const lunarResponse = await axios.post(`https://api.lunar.dev/v1/search/transactions`, body, {
      headers: { 'X-Api-Key': this.nodeApiKey },
    })
    const data: SearchTxResponse = lunarResponse.data

    // fetching all blocks is only necessary to populate the "date" param in Tx
    const blocks = []
    for (const tx of data.transactions) {
      const block = await this.getBlock(network, tx.block_identifier)
      blocks.push(block)
    }

    const txPage = mapFromSearchTransactionsToTxsPage(data, blocks)
    return txPage
  }

  getTxData = async (network: Network, txId: string): Promise<Tx> => {
    try {
      const networkIdentifier = mapToRosettaNetwork(network)

      const body: SearchTxParams = {
        network_identifier: networkIdentifier,
        transaction_identifier: {
          hash: txId,
        },
        limit: 1,
      }

      const lunarResponse = await axios.post(`https://api.lunar.dev/v1/search/transactions`, body, {
        headers: { 'X-Api-Key': this.nodeApiKey },
      })
      const data: SearchTxResponse = lunarResponse.data

      if (data.transactions.length > 0) {
        // fetching all blocks is only necessary to populate the "date" param in Tx
        const blocks = []
        for (const tx of data.transactions) {
          const block = await this.getBlock(network, tx.block_identifier)
          blocks.push(block)
        }

        const tx = mapFromSearchTransactionsToTx(data, blocks)

        return tx
      } else {
        throw new Error('transaction not found')
      }
    } catch (error) {
      throw new Error(error)
    }
  }

  getBlock = async (network: Network, params?: { hash?: string; index?: number }): Promise<BlockResponse> => {
    const body: BlockRequest = {
      network_identifier: mapToRosettaNetwork(network),
      block_identifier: {},
    }

    if (params) {
      if (params.hash) {
        body.block_identifier.hash = params.hash
      }

      if (params.index) {
        body.block_identifier.index = params.index
      }
    }

    const block = await this.rosettaClient.block(body)
    return block
  }

  constructionPreprocess = async (network: Network, ops: Operation[]): Promise<ConstructionPreprocessResponse> => {
    try {
      const body: ConstructionPreprocessRequest = {
        network_identifier: mapToRosettaNetwork(network),
        operations: ops,
      }
      return this.rosettaClient.preprocess(body)
    } catch (error) {
      throw new Error(error)
    }
  }

  constructionMetadata = async (
    network: Network,
    preprocessRes: ConstructionPreprocessResponse,
  ): Promise<ConstructionMetadataResponse> => {
    try {
      const body: ConstructionMetadataRequest = {
        network_identifier: mapToRosettaNetwork(network),
        options: preprocessRes.options ?? {},
      }

      return await this.rosettaClient.metadata(body)
    } catch (error) {
      throw new Error(error)
    }
  }

  constructionPayloads = async (
    network: Network,
    metadataRes: ConstructionMetadataResponse,
    ops: Operation[],
  ): Promise<ConstructionPayloadsResponse> => {
    try {
      const body: ConstructionPayloadsRequest = {
        network_identifier: mapToRosettaNetwork(network),
        metadata: metadataRes.metadata,
        operations: ops,
      }
      const payloadsRes = await this.rosettaClient.payloads(body)

      payloadsRes.payloads[0]

      return payloadsRes
    } catch (error) {
      throw new Error(error)
    }
  }

  constructionParse = async (params: { network: Network; signed: boolean; transaction: string }) => {
    const { network, signed, transaction } = params

    try {
      const body: ConstructionParseRequest = {
        network_identifier: mapToRosettaNetwork(network),
        signed: signed,
        transaction: transaction,
      }
      return this.rosettaClient.parse(body)
    } catch (error) {
      throw new Error(error)
    }
  }

  constructionCombine = async (params: {
    network: Network
    payloadsRes: ConstructionPayloadsResponse
    privateKey: Buffer
    publicKey: Buffer
  }): Promise<ConstructionCombineResponse> => {
    const { network, payloadsRes, privateKey, publicKey } = params

    try {
      const combineBody: ConstructionCombineRequest = {
        network_identifier: mapToRosettaNetwork(network),
        unsigned_transaction: payloadsRes.unsigned_transaction,
        signatures: [
          {
            // hex_bytes: btcKeys.sign(Buffer.from(payloadsRes.payloads[0].hex_bytes, 'hex')).toString('hex'),
            hex_bytes: thorDevKit.cry.secp256k1
              .sign(Buffer.from(payloadsRes.payloads[0].hex_bytes, 'hex'), privateKey)
              .toString('hex'),
            signing_payload: payloadsRes.payloads[0],
            public_key: {
              hex_bytes: publicKey.toString('hex'),
              curve_type: 'secp256k1',
            },
            signature_type: 'ecdsa',
          },
        ],
      }

      return await this.rosettaClient.combine(combineBody)
    } catch (error) {
      throw new Error(error)
    }
  }

  constructionHash = async (params: { network: Network; signedTx: string }): Promise<TransactionIdentifierResponse> => {
    const { network, signedTx } = params

    try {
      const body: ConstructionHashRequest = {
        network_identifier: mapToRosettaNetwork(network),
        signed_transaction: signedTx,
      }
      return await this.rosettaClient.hash(body)
    } catch (error) {
      throw new Error(error)
    }
  }

  constructionSubmit = async (params: {
    network: Network
    signedTx: string
  }): Promise<TransactionIdentifierResponse> => {
    const { network, signedTx } = params

    try {
      const body: ConstructionSubmitRequest = {
        network_identifier: mapToRosettaNetwork(network),
        signed_transaction: signedTx,
      }
      return await this.rosettaClient.submit(body)
    } catch (error) {
      throw new Error(error)
    }
  }
}
