import { Client } from '../src/client'

describe('Client Test', () => {
  let client: Client

  const phrase = 'foster blouse cattle fiction deputy social brown toast various sock awkward print'
  const address = '0xdeebc9c7bacf0a72f82752a707b262121cf61800'

  beforeEach(() => {
    client = new Client({ phrase, network: 'testnet', nodeApiKey: '1kdtEYp3HMm226RyMC33cgoSiAr' })
  })

  afterEach(() => {
    client.purgeClient()
  })

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
  })

  it('should start with empty wallet', async () => {
    const clientMainnet = new Client({ phrase, network: 'mainnet' })
    const addressMain = clientMainnet.getAddress()
    expect(addressMain).toEqual(address)

    const clientTestnet = new Client({ phrase, network: 'testnet' })
    const addressTest = clientTestnet.getAddress()
    expect(addressTest).toEqual(address)
  })

  it('throws an error passing an invalid phrase', async () => {
    expect(() => {
      new Client({ phrase: 'invalid phrase', network: 'mainnet' })
    }).toThrow()

    expect(() => {
      new Client({ phrase: 'invalid phrase', network: 'testnet' })
    }).toThrow()
  })

  it('should be a valid address', async () => {
    const address = client.getAddress()
    const validAddress = client.validateAddress(address)
    expect(validAddress).toEqual(true)
  })

  it('has balances', async () => {
    const balance = await client.getBalance('0xdFa47595F5Fe007a4b22b091De9B8e4fcE0e3C30')
    const vet = balance.find((bal) => bal.asset.symbol === 'VET')

    console.log('balance is: ', vet?.amount.amount().toNumber())

    // check VET
    expect(
      vet?.amount
        .amount()
        .div(10 ** 18)
        .toNumber(),
    ).toEqual(490)
  })

  it('retrieves transactions by address', async () => {
    const txsRes = await client.getTransactions({ address: '0xdFa47595F5Fe007a4b22b091De9B8e4fcE0e3C30' })
    console.log('------> txs is: ', txsRes)
    expect(txsRes.txs.length).toBeGreaterThan(0)
  })
})
