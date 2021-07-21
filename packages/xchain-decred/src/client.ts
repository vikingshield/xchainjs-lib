import {
  Address,
  Balance,
  Fee,
  //FeeOption,
  FeeRate,
  Network,
  Tx,
  TxHash,
  TxHistoryParams,
  TxParams,
  //TxType,
  TxsPage,
  UTXOClient,
  XChainClientParams,
} from '@xchainjs/xchain-client'
import { getSeed } from '@xchainjs/xchain-crypto'
import {
  //AssetDCR,
  Chain,
  // assetAmount,
  // assetToBase
} from '@xchainjs/xchain-util'
import * as Decred from 'decredjs-lib'

// import { DCR_DECIMAL } from './const'
// import * as dcrdata from './dcrdata-api'
//import * as Utils from './utils'
//import { dcrNetwork } from './utils'

export type DecredClientParams = XChainClientParams & {
  dcrdataUrl?: string
}

/**
 * Custom Bitcoin client
 */
class Client extends UTXOClient {
  // private dcrdataUrl = ''

  /**
   * Constructor
   * Client is initialised with network type
   *
   * @param {DecredClientParams} params
   */
  constructor({
    network = Network.Testnet,
    // dcrdataUrl = 'https://dcrdata.decred.org', // this is not used.
    rootDerivationPaths = {
      [Network.Mainnet]: `m/44'/42'/0'`,
      [Network.Testnet]: `m/44'/1'/0'`,
    },
    phrase = '',
  }: DecredClientParams) {
    super(Chain.Decred, { network, rootDerivationPaths, phrase })
    // this.setDcrdataUrl(dcrdataUrl)
  }

  /**
   * Set/Update the dcrdata url.
   *
   * @param {string} url The new dcrdata url.
   * @returns {void}
   */
  // setDcrdataUrl(url: string): void {
  //   this.dcrdataUrl = url
  // }

  /**
   * Get the explorer url.
   *
   * @returns {string} The explorer url based on the network.
   */
  getExplorerUrl(): string {
    switch (this.network) {
      case Network.Mainnet:
        return 'https://dcrdata.decred.org/api'
      case Network.Testnet:
        return 'https://testnet.dcrdata.org/api'
    }
  }

  /**
   * Get the explorer url for the given address.
   *
   * @param {Address} address
   * @returns {string} The explorer url for the given address based on the network.
   */
  getExplorerAddressUrl(address: string): string {
    return `${this.getExplorerUrl()}/address/${address}` // TODO: Verify: this only returns the last 10 tx
  }
  /**
   * Get the explorer url for the given transaction id.
   *
   * @param {string} txID The transaction id
   * @returns {string} The explorer url for the given transaction id based on the network.
   */
  getExplorerTxUrl(txID: string): string {
    return `${this.getExplorerUrl()}/tx/${txID}`
  }

  /**
   * Get the current address.
   *
   * Generates a network-specific key-pair by first converting the buffer to a Wallet-Import-Format (WIF)
   * The address is then decoded into type P2PKH and returned.
   *
   * @returns {Address} The current address.
   *
   * @throws {"Phrase must be provided"} Thrown if phrase has not been set before.
   * @throws {"Address not defined"} Thrown if failed creating account from phrase.
   */
  getAddress(index = 0): Address {
    if (index < 0) {
      throw new Error('index must be greater than zero')
    }
    if (this.phrase) {
      const privkey = this.getDcrKey(this.phrase, index)
      if (!privkey) {
        throw new Error('Could not get private key from phrase')
      }
      const address = privkey.publicKey.toAddress().toString()
      if (!address) {
        throw new Error('Address not defined')
      }
      return address
    }
    throw new Error('Phrase must be provided')
  }

  /**
   * @private
   * Get private key.
   *
   * Private function to get keyPair from the this.phrase
   *
   * @param {string} phrase The phrase to be used for generating privkey
   * @returns {ECPairInterface} The privkey generated from the given phrase
   *
   * @throws {"Could not get private key from phrase"} Throws an error if failed creating BTC keys from the given phrase
   * */
  private getDcrKey(phrase: string, index = 0) {
    // const dcrNetwork = Utils.dcrNetwork(this.network)
    let dn, path
    switch (this.network) {
      case Network.Mainnet:
        dn = Decred.Networks.dcrdlivenet
        path = `${this.rootDerivationPaths?.mainnet}/${index}'`
        break
      case Network.Testnet:
        dn = Decred.Networks.dcrdtestnet
        path = `${this.rootDerivationPaths?.testnet}/${index}'`
        break
    }
    const seed = getSeed(phrase)
    // Decred.fromSeed returns a HDPrivatekey.
    const master = Decred.HDPrivateKey.fromSeed(seed.toString('hex'), dn)
    const dmaster = master.derive(path)
    const privkey = dmaster.privateKey

    if (!privkey) {
      throw new Error('Could not get private key from phrase')
    }

    return privkey
  }

  /**
   * Validate the given address.
   *
   * @param {Address} address
   * @returns {boolean} `true` or `false`
   */
  validateAddress(address: string): boolean {
    //return Utils.validateAddress(address, this.network)
    return Decred.isValid(address, this.network)
  }

  /**
   * Get the BTC balance of a given address.
   *
   * @param {Address} the BTC address
   * @returns {Balance[]} The BTC balance of the address.
   */
  // async getBalance(address: Address): Promise<Balance[]> {
  async getBalance(_: Address): Promise<Balance[]> {
    // return Utils.getBalance({
    //   dcrdataUrl: this.dcrdataUrl,
    //   network: this.network,
    //   address: address,
    // })
    return {} as Promise<Balance[]>
  }

  /**
   * Get transaction history of a given address with pagination options.
   * By default it will return the transaction history of the current wallet.
   *
   * @param {TxHistoryParams} params The options to get transaction history. (optional)
   * @returns {TxsPage} The transaction history.
   */
  // async getTransactions(params?: TxHistoryParams): Promise<TxsPage> {
  async getTransactions(_?: TxHistoryParams): Promise<TxsPage> {
    // Sochain API doesn't have pagination parameter
    // const offset = params?.offset ?? 0
    // const limit = params?.limit || 10
    //
    // const response = await dcrdata.getAddress({
    //   address: params?.address + '',
    //   dcrdataUrl: this.dcrdataUrl,
    //   network: this.network,
    // })
    // const total = response.txs.length
    // const transactions: Tx[] = []
    //
    // const txs = response.txs.filter((_: any, index: number) => offset <= index && index < offset + limit)
    // for (const txItem of txs) {
    //   const rawTx = await dcrdata.getTx({
    //     dcrdataUrl: this.dcrdataUrl,
    //     network: this.network,
    //     hash: txItem.txid,
    //   })
    //   const tx: Tx = {
    //     asset: AssetBTC,
    //     from: rawTx.inputs.map((i) => ({
    //       from: i.address,
    //       amount: assetToBase(assetAmount(i.value, DCR_DECIMAL)),
    //     })),
    //     to: rawTx.outputs
    //       .filter((i) => i.type !== 'nulldata')
    //       .map((i) => ({ to: i.address, amount: assetToBase(assetAmount(i.value, DCR_DECIMAL)) })),
    //     date: new Date(rawTx.time * 1000),
    //     type: TxType.Transfer,
    //     hash: rawTx.txid,
    //   }
    //   transactions.push(tx)
    // }
    //
    // const result: TxsPage = {
    //   total,
    //   txs: transactions,
    // }
    // return result
    return {} as Promise<TxsPage>
  }

  /**
   * Get the transaction details of a given transaction id.
   *
   * @param {string} txId The transaction id.
   * @returns {Tx} The transaction details of the given transaction id.
   */
  async getTransactionData(_: string): Promise<Tx> {
    // async getTransactionData(txId: string): Promise<Tx> {
    // const rawTx = await dcrdata.getTx({
    //   dcrdataUrl: this.dcrdataUrl,
    //   network: this.network,
    //   hash: txId,
    // })
    // return {
    //   asset: AssetBTC,
    //   from: rawTx.inputs.map((i) => ({
    //     from: i.address,
    //     amount: assetToBase(assetAmount(i.value, DCR_DECIMAL)),
    //   })),
    //   to: rawTx.outputs.map((i) => ({ to: i.address, amount: assetToBase(assetAmount(i.value, DCR_DECIMAL)) })),
    //   date: new Date(rawTx.time * 1000),
    //   type: TxType.Transfer,
    //   hash: rawTx.txid,
    // }
    return {} as Promise<Tx>
  }

  protected async getSuggestedFeeRate(): Promise<FeeRate> {
    // return await dcrdata.getSuggestedTxFee()
    return {} as Promise<FeeRate>
  }
  protected async calcFee(_: FeeRate, __?: string): Promise<Fee> {
    // protected async calcFee(feeRate: FeeRate, memo?: string): Promise<Fee> {
    // return Utils.calcFee(feeRate, memo)
    return {} as Promise<Fee>
  }

  /**
   * Transfer BTC.
   *
   * @param {TxParams&FeeRate} params The transfer options.
   * @returns {TxHash} The transaction hash.
   */
  async transfer(_: TxParams & { feeRate?: FeeRate }): Promise<TxHash> {
    // const fromAddressIndex = params?.walletIndex || 0
    //
    // // set the default fee rate to `fast`
    // const feeRate = params.feeRate || (await this.getFeeRates())[FeeOption.Fast]
    //
    // /**
    //  * do not spend pending UTXOs when adding a memo
    //  * https://github.com/xchainjs/xchainjs-lib/issues/330
    //  */
    // const spendPendingUTXO: boolean = params.memo ? false : true
    //
    // const { psbt } = await Utils.buildTx({
    //   ...params,
    //   feeRate,
    //   sender: this.getAddress(fromAddressIndex),
    //   dcrdataUrl: this.dcrdataUrl,
    //   network: this.network,
    //   spendPendingUTXO,
    // })
    //
    // const btcKeys = this.getDcrKey(this.phrase, fromAddressIndex)
    // psbt.signAllInputs(btcKeys) // Sign all inputs
    // psbt.finalizeAllInputs() // Finalise inputs
    // const txHex = psbt.extractTransaction().toHex() // TX extracted and formatted to hex
    //
    // return await Utils.broadcastTx({ network: this.network, txHex, dcrdataUrl: this.dcrdataUrl })
    return {} as Promise<TxHash>
  }
}

export { Client }
