import { Balances, Network, Tx, TxFrom, TxsPage, TxTo } from '@xchainjs/xchain-client/lib'
import {
  AccountBalanceResponse,
  AccountIdentifier,
  BlockResponse,
  NetworkIdentifier,
} from '@lunarhq/rosetta-ts-client/src'
import { AssetVET, Vechain } from './types'
import { baseAmount } from '@xchainjs/xchain-util/lib'
import { SearchTxResponse } from './lunar-api'

export const DECIMAL = 18

/**
 * Takes 'testnet' or 'mainnet' and returns a Rosetta Compliant NetworkIdentifier
 * @param network
 */
export const mapToRosettaNetwork = (network: Network): NetworkIdentifier => {
  return network === 'testnet'
    ? {
        blockchain: 'vechainthor',
        network: 'test',
      }
    : {
        blockchain: 'vechainthor',
        network: 'main',
      }
}

export const mapToRosettaAccountIdentifier = (address: string): AccountIdentifier => {
  return { address }
}

export const mapFromRosettaAccountBalanceResponse = (accountBalanceResponse: AccountBalanceResponse): Balances => {
  return accountBalanceResponse.balances.map((balance) => ({
    asset: {
      chain: Vechain,
      symbol: balance.currency.symbol,
      ticker: balance.currency.symbol,
    },
    amount: baseAmount(balance.value, balance.currency.decimals),
  }))
  return []
}

export const mapFromSearchTransactionsToTxsPage = (
  transactionsResponse: SearchTxResponse,
  blocks: BlockResponse[], // passing in blocks is only necessary to populate the "date" param in Tx
): TxsPage => ({
  total: 0, // this is a pending Rosetta spec... https://github.com/coinbase/rosetta-specifications/issues/69
  txs: transactionsResponse.transactions.map((tx) => {
    const associatedBlock = blocks.find((block) => {
      block.block?.block_identifier.hash === tx.block_identifier.hash
    })

    const txPageItem: Tx = {
      asset: AssetVET,
      from: tx.transaction.operations
        // fetch the 'INPUT' Operations
        .filter((op) => op.type === 'input')
        // Convert Operation to TxFrom
        .map(
          (op): TxFrom => ({
            from: op.account?.address ?? '',
            amount: baseAmount(op.amount?.value),
          }),
        ),
      to: tx.transaction.operations
        // fetch the 'INPUT' Operations
        .filter((op) => op.type === 'output')
        // Convert Operation to TxFrom
        .map(
          (op): TxTo => ({
            to: op.account?.address ?? '',
            amount: baseAmount(op.amount?.value),
          }),
        ),
      date: associatedBlock?.block?.timestamp ? new Date(associatedBlock?.block?.timestamp) : new Date(),
      type: 'transfer',
      hash: tx.transaction.transaction_identifier.hash,
    }
    return txPageItem
  }),
})

export const mapFromSearchTransactionsToTx = (
  transactionsResponse: SearchTxResponse,
  blocks: BlockResponse[], // passing in blocks is only necessary to populate the "date" param in Tx
): Tx => {
  if (transactionsResponse.transactions.length > 0) {
    const tx = transactionsResponse.transactions[0]

    const associatedBlock = blocks.find((block) => {
      block.block?.block_identifier.hash === tx.block_identifier.hash
    })

    return {
      asset: AssetVET,
      from: tx.transaction.operations
        // fetch the 'INPUT' Operations
        .filter((op) => op.type === 'input')
        // Convert Operation to TxFrom
        .map(
          (op): TxFrom => ({
            from: op.account?.address ?? '',
            amount: baseAmount(op.amount?.value),
          }),
        ),
      to: tx.transaction.operations
        // fetch the 'INPUT' Operations
        .filter((op) => op.type === 'output')
        // Convert Operation to TxFrom
        .map(
          (op): TxTo => ({
            to: op.account?.address ?? '',
            amount: baseAmount(op.amount?.value),
          }),
        ),
      date: associatedBlock?.block?.timestamp ? new Date(associatedBlock?.block?.timestamp) : new Date(),
      type: 'transfer',
      hash: tx.transaction.transaction_identifier.hash,
    }
  } else {
    throw new Error('No transaction found')
  }
}
