import { BigSource } from 'big.js'

import { cosmosclient, cosmos } from 'cosmos-client'

export type CosmosSDKClientParams = {
  server: string
  chainId: string
  prefix?: string
  derive_path?: string
}

export type SearchTxParams = {
  messageAction?: string
  messageSender?: string
  transferSender?: string
  transferRecipient?: string
  page?: number
  limit?: number
  txMinHeight?: number
  txMaxHeight?: number
}

export type TransferParams = {
  privkey: cosmosclient.PrivKey
  from: string
  to: string
  amount: BigSource
  asset: string
  memo?: string
  fee?: cosmos.tx.v1beta1.IFee
}

export type BaseAccountResponse = {
  type?: string
  value?: cosmos.auth.v1beta1.BaseAccount
}

export type RawTxResponse = {
  body: cosmos.tx.v1beta1.ITxBody
}

export type TxEventAttribute = {
  key: string
  value: string
}

export type TxEvent = {
  type: string
  attributes: TxEventAttribute[]
}

export type TxLog = {
  msg_index: number
  log: string
  events: TxEvent[]
}

export type TxResponse = {
  height?: number
  txhash?: string
  data: string
  raw_log?: string
  logs?: TxLog[]
  gas_wanted?: string
  gas_used?: string
  tx?: unknown
  timestamp: string
}

export type TxHistoryResponse = {
  total_count?: number
  count?: number
  page_number?: number
  page_total?: number
  limit?: number
  txs?: Array<TxResponse>
}

export type APIQueryParam = {
  [x: string]: string
}

export type RPCTxResult = {
  hash: string
  height: string
  index: number
  tx_result: {
    code: number
    data: string
    log: string
    info: string
    gas_wanted: string
    gas_used: string
    events: TxEvent[]
    codespace: string
  }
  tx: string
}

export type RPCTxSearchResult = {
  txs: RPCTxResult[]
  total_count: string
}

export type RPCResponse<T> = {
  jsonrpc: string
  id: number
  result: T
}
