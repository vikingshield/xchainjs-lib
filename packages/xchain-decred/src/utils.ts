import {
  Address,
  Balance,
  FeeOption,
  FeeRate,
  Fees,
  FeesWithRates,
  Network,
  TxHash,
  TxParams,
  calcFees,
  standardFeeRates,
} from '@xchainjs/xchain-client'
import { AssetDCR, BaseAmount, assetAmount, assetToBase, baseAmount } from '@xchainjs/xchain-util'
import accumulative from 'coinselect/accumulative'
import * as Decred from 'decredjs-lib'

import { DCR_DECIMAL, MIN_TX_FEE } from './const'
import * as dcrdata from './dcrdata-api'
import { BroadcastTxParams, UTXO } from './types/common'
import { AddressParams, DcrAddressUTXO, ScanUTXOParam } from './types/dcrdata-api-types'

const TX_EMPTY_SIZE = 4 + 1 + 1 + 4 //10
const TX_INPUT_BASE = 32 + 4 + 1 + 4 // 41
const TX_INPUT_PUBKEYHASH = 107
const TX_OUTPUT_BASE = 8 + 1 //9
const TX_OUTPUT_PUBKEYHASH = 25

const inputBytes = (input: UTXO): number => {
  return TX_INPUT_BASE + (input.witnessUtxo.script ? input.witnessUtxo.script.length : TX_INPUT_PUBKEYHASH)
}
/**
 * Compile memo.
 *
 * @param {string} memo The memo to be compiled.
 * @returns {Buffer} The compiled memo.
 */
export const compileMemo = (memo: string): Buffer => {
  const data = Buffer.from(memo, 'utf8') // converts MEMO to buffer
  return Decred.script.compile([Decred.opcodes.OP_RETURN, data]) // Compile OP_RETURN script
}

/**
 * Get the transaction fee.
 *
 * @param {UTXO[]} inputs The UTXOs.
 * @param {FeeRate} feeRate The fee rate.
 * @param {Buffer} data The compiled memo (Optional).
 * @returns {number} The fee amount.
 */
export const getFee = (inputs: UTXO[], feeRate: FeeRate, data: Buffer | null = null): number => {
  let sum =
    TX_EMPTY_SIZE +
    inputs.reduce((a, x) => a + inputBytes(x), 0) +
    inputs.length + // +1 byte for each input signature
    TX_OUTPUT_BASE +
    TX_OUTPUT_PUBKEYHASH +
    TX_OUTPUT_BASE +
    TX_OUTPUT_PUBKEYHASH

  if (data) {
    sum += TX_OUTPUT_BASE + data.length
  }
  const fee = sum * feeRate
  return fee > MIN_TX_FEE ? fee : MIN_TX_FEE
}

/**
 * Get the average value of an array.
 *
 * @param {number[]} array
 * @returns {number} The average value.
 */
export const arrayAverage = (array: number[]): number => {
  let sum = 0
  array.forEach((value) => (sum += value))
  return sum / array.length
}

/**
 * Get Bitcoin network to be used with bitcoinjs.
 *
 * @param {Network} network
 * @returns {Decred.Network} The BTC network.
 */
export const dcrNetwork = (network: Network): Decred.Network => {
  switch (network) {
    case Network.Mainnet:
      return Decred.Networks.livenet
    case Network.Testnet:
      return Decred.Networks.testnet
  }
}

/**
 * Get the balances of an address.
 *
 * @param {string} sochainUrl sochain Node URL.
 * @param {Network} network
 * @param {Address} address
 * @returns {Balance[]} The balances of the given address.
 */
export const getBalance = async (params: AddressParams): Promise<Balance[]> => {
  switch (params.network) {
    case Network.Mainnet:
      return [
        {
          asset: AssetDCR,
          amount: await dcrdata.getBalance(params),
        },
      ]
    case Network.Testnet:
      return [
        {
          asset: AssetDCR,
          amount: await dcrdata.getBalance(params),
        },
      ]
  }
}

/**
 * Validate the BTC address.
 *
 * @param {Address} address
 * @param {Network} network
 * @returns {boolean} `true` or `false`.
 */
export const validateAddress = (address: Address, network: Network): boolean => {
  try {
    Decred.address.toOutputScript(address, dcrNetwork(network))
    return true
  } catch (error) {
    return false
  }
}

/**
 * Scan UTXOs from sochain.
 *
 * @param {string} sochainUrl sochain Node URL.
 * @param {Network} network
 * @param {Address} address
 * @returns {UTXO[]} The UTXOs of the given address.
 */
export const scanUTXOs = async ({
  dcrdataUrl,
  network,
  address,
  confirmedOnly = true, // default: scan only confirmed UTXOs
}: ScanUTXOParam): Promise<UTXO[]> => {
  switch (network) {
    case Network.Testnet: {
      let utxos: DcrAddressUTXO[] = []

      const addressParam: AddressParams = {
        dcrdataUrl,
        network,
        address,
      }

      if (confirmedOnly) {
        utxos = await dcrdata.getConfirmedUnspentTxs(addressParam)
      } else {
        utxos = await dcrdata.getUnspentTxs(addressParam)
      }

      return utxos.map(
        (utxo) =>
          ({
            hash: utxo.txid,
            index: utxo.output_no,
            value: assetToBase(assetAmount(utxo.value, DCR_DECIMAL)).amount().toNumber(),
            witnessUtxo: {
              value: assetToBase(assetAmount(utxo.value, DCR_DECIMAL)).amount().toNumber(),
              script: Buffer.from(utxo.script_hex, 'hex'),
            },
          } as UTXO),
      )
    }
    case Network.Mainnet: {
      let utxos: DcrAddressUTXO[] = []

      const addressParam: AddressParams = {
        dcrdataUrl,
        network,
        address,
      }

      if (confirmedOnly) {
        utxos = await dcrdata.getConfirmedUnspentTxs(addressParam)
      } else {
        utxos = await dcrdata.getUnspentTxs(addressParam)
      }

      return utxos.map(
        (utxo) =>
          ({
            hash: utxo.txid,
            index: utxo.output_no,
            value: assetToBase(assetAmount(utxo.value, DCR_DECIMAL)).amount().toNumber(),
            witnessUtxo: {
              value: assetToBase(assetAmount(utxo.value, DCR_DECIMAL)).amount().toNumber(),
              script: Buffer.from(utxo.script_hex, 'hex'),
            },
          } as UTXO),
      )
    }
  }
}

/**
 * Build transcation.
 *
 * @param {BuildParams} params The transaction build options.
 * @returns {Transaction}
 */
export const buildTx = async ({
  amount,
  recipient,
  memo,
  feeRate,
  sender,
  network,
  dcrdataUrl,
  spendPendingUTXO = false, // default: prevent spending uncomfirmed UTXOs
}: TxParams & {
  feeRate: FeeRate
  sender: Address
  network: Network
  dcrdataUrl: string
  spendPendingUTXO?: boolean
}): Promise<{ psbt: Decred.Psbt; utxos: UTXO[] }> => {
  // search only confirmed UTXOs if pending UTXO is not allowed
  const confirmedOnly = !spendPendingUTXO
  const utxos = await scanUTXOs({ dcrdataUrl, network, address: sender, confirmedOnly })

  if (utxos.length === 0) throw new Error('No utxos to send')
  if (!validateAddress(recipient, network)) throw new Error('Invalid address')

  const feeRateWhole = Number(feeRate.toFixed(0))
  const compiledMemo = memo ? compileMemo(memo) : null

  const targetOutputs = []

  //1. add output amount and recipient to targets
  targetOutputs.push({
    address: recipient,
    value: amount.amount().toNumber(),
  })
  //2. add output memo to targets (optional)
  if (compiledMemo) {
    targetOutputs.push({ script: compiledMemo, value: 0 })
  }
  const { inputs, outputs } = accumulative(utxos, targetOutputs, feeRateWhole)

  // .inputs and .outputs will be undefined if no solution was found
  if (!inputs || !outputs) throw new Error('Insufficient Balance for transaction')

  const psbt = new Decred.Psbt({ network: btcNetwork(network) }) // Network-specific

  // psbt add input from accumulative inputs
  inputs.forEach((utxo: UTXO) =>
    psbt.addInput({
      hash: utxo.hash,
      index: utxo.index,
      witnessUtxo: utxo.witnessUtxo,
    }),
  )

  // psbt add outputs from accumulative outputs
  outputs.forEach((output: Bitcoin.PsbtTxOutput) => {
    if (!output.address) {
      //an empty address means this is the  change ddress
      output.address = sender
    }
    if (!output.script) {
      psbt.addOutput(output)
    } else {
      //we need to add the compiled memo this way to
      //avoid dust error tx when accumulating memo output with 0 value
      if (compiledMemo) {
        psbt.addOutput({ script: compiledMemo, value: 0 })
      }
    }
  })

  return { psbt, utxos }
}

/**
 * Broadcast the transaction.
 *
 * @param {BroadcastTxParams} params The transaction broadcast options.
 * @returns {TxHash} The transaction hash.
 */
export const broadcastTx = async ({ network, txHex, dcrdataUrl }: BroadcastTxParams): Promise<TxHash> => {
  return await dcrdata.broadcastTx({ network, txHex, dcrdataUrl })
}

/**
 * Calculate fees based on fee rate and memo.
 *
 * @param {FeeRate} feeRate
 * @param {string} memo
 * @returns {BaseAmount} The calculated fees based on fee rate and the memo.
 */
export const calcFee = (feeRate: FeeRate, memo?: string): BaseAmount => {
  const compiledMemo = memo ? compileMemo(memo) : null
  const fee = getFee([], feeRate, compiledMemo)
  return baseAmount(fee)
}

/**
 * Get the default fees with rates.
 *
 * @returns {FeesWithRates} The default fees and rates.
 */
export const getDefaultFeesWithRates = (): FeesWithRates => {
  const rates = {
    ...standardFeeRates(20),
    [FeeOption.Fastest]: 50,
  }

  return {
    fees: calcFees(rates, calcFee),
    rates,
  }
}

/**
 * Get the default fees.
 *
 * @returns {Fees} The default fees.
 */
export const getDefaultFees = (): Fees => {
  const { fees } = getDefaultFeesWithRates()
  return fees
}

/**
 * Get address prefix based on the network.
 *
 * @param {Network} network
 * @returns {string} The address prefix based on the network.
 *
 **/
export const getPrefix = (network: Network) => {
  switch (network) {
    case Network.Mainnet:
      return 'bc1'
    case Network.Testnet:
      return 'tb1'
  }
}
