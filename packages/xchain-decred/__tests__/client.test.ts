import { Network } from '@xchainjs/xchain-client'
// import { AssetBTC, baseAmount } from '@xchainjs/xchain-util'

// import mockSochainApi from '../__mocks__/sochain'
import { Client } from '../src/client'
// import { MIN_TX_FEE } from '../src/const'

// mockSochainApi.init()

const dcrClient = new Client({ network: 'mainnet' as Network, dcrdataUrl: 'https://dcrdata.decred.org/api/' })

describe('DecredClient Test', () => {
  beforeEach(() => {
    dcrClient.purgeClient()
  })
  afterEach(() => dcrClient.purgeClient())

  // const MEMO = 'SWAP:THOR.RUNE'
  // please don't touch the tBTC in these
  const phraseOne = 'atom green various power must another rent imitate gadget creek fat then'
  // https://iancoleman.io/bip39/
  // m/44'/1'/0'/0/0
  const addyOnePath0 = 'TsX92kUWoJJj85jKj9Ti7f4uoF8JMETRfch'
  // m/44'/1'/0'/0/1
  // const addyOnePath1 = 'TsRd2wTk2BnDQ2pPTWJRtW3adz9kTz7oFif'
  // const addyTwo = 'TsZ6VziAydwjgXm1KuAmb99seXf3vS5MXns'

  // const phraseOneMainnet_path0 = 'Dsbo3u3MQnKkxUvhbNyMb3ffzszB9naS8aJ'
  // const phraseOneMainnet_path1 = 'DsXFXwmBZBo7xrTDJCM3EubBNSGUzzLBBFx'

  // Third ones is used only for balance verification
  // const phraseTwo = 'quantum vehicle print stairs canvas kid erode grass baby orbit lake remove'
  // const addyThreePath0 = 'TseVdSHGJJHKMRDUJ8WzAaWmGtbp3pCFkxd'
  // const addyThreePath1 = 'TsnuqFn7VNpnbZEktzzBGtMq9s6w6iYMn9j'
  //
  // const phraseTwoMainnet_path0 = 'DsTqrTDdPbSCuQR9ZG5ZfFSqSJmNFu3NGmn'
  // const phraseTwoMainnet_path1 = 'DsnVFyDpB4B33zY9c5opTxHi5RGPsAVJmvh'

  it('set phrase should return correct address', () => {
    dcrClient.setNetwork('testnet' as Network)
    const result = dcrClient.setPhrase(phraseOne)
    expect(result).toEqual(addyOnePath0)
  })

  it('should throw an error for setting a bad phrase', () => {
    expect(() => dcrClient.setPhrase('cat')).toThrow()
  })

  it('should not throw an error for setting a good phrase', () => {
    expect(dcrClient.setPhrase(phraseOne)).toBeUndefined
  })

  it('should validate the right address', () => {
    dcrClient.setNetwork('testnet' as Network)
    dcrClient.setPhrase(phraseOne)
    const address = dcrClient.getAddress()
    const valid = dcrClient.validateAddress(address)
    expect(address).toEqual(addyOnePath0)
    expect(valid).toBeTruthy()
  })

  // it('should get the right balance', async () => {
  //   const expectedBalance = 15446
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseTwo)
  //   const balance = await dcrClient.getBalance(dcrClient.getAddress())
  //   expect(balance.length).toEqual(1)
  //   expect(balance[0].amount.amount().toNumber()).toEqual(expectedBalance)
  // })
  //
  // it('should broadcast a normal transfer', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const amount = baseAmount(2223)
  //   const txid = await dcrClient.transfer({ walletIndex: 0, asset: AssetBTC, recipient: addyTwo, amount, feeRate: 1 })
  //   expect(txid).toEqual(expect.any(String))
  // })
  //
  // it('should broadcast a normal transfer without feeRate option', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const amount = baseAmount(2223)
  //   const txid = await dcrClient.transfer({ asset: AssetBTC, recipient: addyTwo, amount })
  //   expect(txid).toEqual(expect.any(String))
  // })
  //
  // it('should purge phrase and utxos', async () => {
  //   dcrClient.purgeClient()
  //   expect(() => dcrClient.getAddress()).toThrow('Phrase must be provided')
  // })
  //
  // it('should do broadcast a vault transfer with a memo', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //
  //   /**
  //    * All UTXO values: 8800 + 495777 + 15073
  //    * Confirmed UTXO values: 8800 + 15073 = 23873
  //    * Spend amount: 2223
  //    * Expected: Successful
  //    */
  //
  //   const amount = baseAmount(2223)
  //   try {
  //     const txid = await dcrClient.transfer({
  //       asset: AssetBTC,
  //       recipient: addyThreePath0,
  //       amount,
  //       memo: MEMO,
  //       feeRate: 1,
  //     })
  //     expect(txid).toEqual(expect.any(String))
  //   } catch (err) {
  //     console.log('ERR running test', err)
  //     throw err
  //   }
  // })
  // it('should prevent spending unconfirmed utxo if memo exists', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //
  //   /**
  //    * All UTXO values: 8800 + 495777 + 15073
  //    * Confirmed UTXO values: 8800 + 15073 = 23873
  //    * Spend amount: 25000
  //    * Expected: Insufficient Balance
  //    */
  //
  //   const amount = baseAmount(25000)
  //   return expect(
  //     dcrClient.transfer({
  //       asset: AssetBTC,
  //       recipient: addyThreePath0,
  //       amount,
  //       memo: MEMO,
  //       feeRate: 1,
  //     }),
  //   ).rejects.toThrow('Insufficient Balance for transaction')
  // })
  // it('should get the balance of an address without phrase', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.purgeClient()
  //   const balance = await dcrClient.getBalance(addyThreePath0)
  //   expect(balance.length).toEqual(1)
  //   expect(balance[0].amount.amount().toNumber()).toEqual(15446)
  // })
  //
  // it('should prevent a tx when fees and valueOut exceed balance', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //
  //   const asset = AssetBTC
  //   const amount = baseAmount(9999999999)
  //   return expect(dcrClient.transfer({ asset, recipient: addyTwo, amount, feeRate: 1 })).rejects.toThrow(
  //     'Insufficient Balance for transaction',
  //   )
  // })
  //
  // it('returns fees and rates of a normal tx', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const { fees, rates } = await dcrClient.getFeesWithRates()
  //   // check fees
  //   expect(fees.fast).toBeDefined()
  //   expect(fees.fastest).toBeDefined()
  //   expect(fees.average).toBeDefined()
  //   // check rates
  //   expect(rates.fast).toBeDefined()
  //   expect(rates.fastest).toBeDefined()
  //   expect(rates.average).toBeDefined()
  // })
  //
  // it('returns fees and rates of a tx w/ memo', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const { fees, rates } = await dcrClient.getFeesWithRates(MEMO)
  //   // check fees
  //   expect(fees.fast).toBeDefined()
  //   expect(fees.fastest).toBeDefined()
  //   expect(fees.average).toBeDefined()
  //   // check rates
  //   expect(rates.fast).toBeDefined()
  //   expect(rates.fastest).toBeDefined()
  //   expect(rates.average).toBeDefined()
  // })
  //
  // it('should return estimated fees of a normal tx', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const estimates = await dcrClient.getFees()
  //   expect(estimates.fast).toBeDefined()
  //   expect(estimates.fastest).toBeDefined()
  //   expect(estimates.average).toBeDefined()
  // })
  //
  // it('should return estimated fees of a vault tx that are more expensive than a normal tx (in case of > MIN_TX_FEE only)', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const normalTx = await dcrClient.getFees()
  //   const vaultTx = await dcrClient.getFeesWithMemo(MEMO)
  //
  //   if (vaultTx.average.amount().isGreaterThan(MIN_TX_FEE)) {
  //     expect(vaultTx.average.amount().isGreaterThan(normalTx.average.amount())).toBeTruthy()
  //   } else {
  //     expect(vaultTx.average.amount().isEqualTo(MIN_TX_FEE)).toBeTruthy()
  //   }
  //
  //   if (vaultTx.fast.amount().isGreaterThan(MIN_TX_FEE)) {
  //     expect(vaultTx.fast.amount().isGreaterThan(normalTx.fast.amount())).toBeTruthy()
  //   } else {
  //     expect(vaultTx.fast.amount().isEqualTo(MIN_TX_FEE)).toBeTruthy()
  //   }
  //
  //   if (vaultTx.fastest.amount().isGreaterThan(MIN_TX_FEE)) {
  //     expect(vaultTx.fastest.amount().isGreaterThan(normalTx.fastest.amount())).toBeTruthy()
  //   } else {
  //     expect(vaultTx.fastest.amount().isEqualTo(MIN_TX_FEE)).toBeTruthy()
  //   }
  // })
  //
  // it('returns different fee rates for a normal tx', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const { fast, fastest, average } = await dcrClient.getFeeRates()
  //   expect(fast > average)
  //   expect(fastest > fast)
  // })
  //
  // it('should error when an invalid address is used in getting balance', () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const invalidIndex = -1
  //   const expectedError = 'index must be greater than zero'
  //   expect(() => dcrClient.getAddress(invalidIndex)).toThrow(expectedError)
  // })
  //
  // it('should error when an invalid address is used in transfer', () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   dcrClient.setPhrase(phraseOne)
  //   const invalidAddress = 'error_address'
  //
  //   const amount = baseAmount(99000)
  //   const expectedError = 'Invalid address'
  //
  //   return expect(
  //     dcrClient.transfer({ asset: AssetBTC, recipient: invalidAddress, amount, feeRate: 1 }),
  //   ).rejects.toThrow(expectedError)
  // })
  //
  // it('should get address transactions', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //
  //   const txPages = await dcrClient.getTransactions({ address: addyThreePath0, limit: 4 })
  //
  //   expect(txPages.total).toEqual(1) //there is 1 tx in addyThreePath0
  //   expect(txPages.txs[0].asset).toEqual(AssetBTC)
  //   expect(txPages.txs[0].date).toEqual(new Date('2020-12-13T11:39:55.000Z'))
  //   expect(txPages.txs[0].hash).toEqual('6e7071a09e82d72c6c84d253047c38dbd7fea531b93155adfe10acfba41bca63')
  //   expect(txPages.txs[0].type).toEqual('transfer')
  //   expect(txPages.txs[0].to.length).toEqual(2)
  //   expect(txPages.txs[0].from.length).toEqual(1)
  // })
  //
  // it('should get address transactions with limit', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   // Limit should work
  //   const txPages = await dcrClient.getTransactions({ address: addyThreePath0, limit: 1 })
  //   return expect(txPages.total).toEqual(1) //there 1 tx in addyThreePath0
  // })
  //
  // it('should get transaction with hash', async () => {
  //   dcrClient.setNetwork('testnet' as Network)
  //   const txData = await dcrClient.getTransactionData(
  //     'b660ee07167cfa32681e2623f3a29dc64a089cabd9a3a07dd17f9028ac956eb8',
  //   )
  //
  //   expect(txData.hash).toEqual('b660ee07167cfa32681e2623f3a29dc64a089cabd9a3a07dd17f9028ac956eb8')
  //   expect(txData.from.length).toEqual(1)
  //   expect(txData.from[0].from).toEqual('2N4nhhJpjauDekVUVgA1T51M5gVg4vzLzNC')
  //   expect(txData.from[0].amount.amount().isEqualTo(baseAmount(8898697, 8).amount())).toBeTruthy()
  //
  //   expect(txData.to.length).toEqual(2)
  //   expect(txData.to[0].to).toEqual('tb1q3a00snh7erczk94k48fe9q5z0fldgnh4twsh29')
  //   expect(txData.to[0].amount.amount().isEqualTo(baseAmount(100000, 8).amount())).toBeTruthy()
  //   expect(txData.to[1].to).toEqual('tb1qxx4azx0lw4tc6ylurc55ak5hl7u2ws0w9kw9h3')
  //   expect(txData.to[1].amount.amount().isEqualTo(baseAmount(8798533, 8).amount())).toBeTruthy()
  // })
  //
  // it('should return valid explorer url', () => {
  //   dcrClient.setNetwork('mainnet' as Network)
  //   expect(dcrClient.getExplorerUrl()).toEqual('https://blockstream.info')
  //
  //   dcrClient.setNetwork('testnet' as Network)
  //   expect(dcrClient.getExplorerUrl()).toEqual('https://blockstream.info/testnet')
  // })
  //
  // it('should retrun valid explorer address url', () => {
  //   dcrClient.setNetwork('mainnet' as Network)
  //   expect(dcrClient.getExplorerAddressUrl('testAddressHere')).toEqual(
  //     'https://blockstream.info/address/testAddressHere',
  //   )
  //   dcrClient.setNetwork('testnet' as Network)
  //   expect(dcrClient.getExplorerAddressUrl('anotherTestAddressHere')).toEqual(
  //     'https://blockstream.info/testnet/address/anotherTestAddressHere',
  //   )
  // })
  //
  // it('should retrun valid explorer tx url', () => {
  //   dcrClient.setNetwork('mainnet' as Network)
  //   expect(dcrClient.getExplorerTxUrl('testTxHere')).toEqual('https://blockstream.info/tx/testTxHere')
  //   dcrClient.setNetwork('testnet' as Network)
  //   expect(dcrClient.getExplorerTxUrl('anotherTestTxHere')).toEqual(
  //     'https://blockstream.info/testnet/tx/anotherTestTxHere',
  //   )
  // })
  //
  // it('should derivate the address correctly', () => {
  //   dcrClient.setNetwork('mainnet' as Network)
  //
  //   dcrClient.setPhrase(phraseOne)
  //   expect(dcrClient.getAddress(0)).toEqual(phraseOneMainnet_path0)
  //   expect(dcrClient.getAddress(1)).toEqual(phraseOneMainnet_path1)
  //
  //   dcrClient.setPhrase(phraseTwo)
  //   expect(dcrClient.getAddress(0)).toEqual(phraseTwoMainnet_path0)
  //   expect(dcrClient.getAddress(1)).toEqual(phraseTwoMainnet_path1)
  //
  //   dcrClient.setNetwork('testnet' as Network)
  //
  //   dcrClient.setPhrase(phraseOne)
  //   expect(dcrClient.getAddress(0)).toEqual(addyOnePath0)
  //   expect(dcrClient.getAddress(1)).toEqual(addyOnePath1)
  //
  //   dcrClient.setPhrase(phraseTwo)
  //   expect(dcrClient.getAddress(0)).toEqual(addyThreePath0)
  //   expect(dcrClient.getAddress(1)).toEqual(addyThreePath1)
  // })
})
