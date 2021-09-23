const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const rewire = require('rewire')

const lambda = require('../../src/lambda/trade')
describe('switch from current ticker to suggested one', () => {
  it('lambda should run', async () => {
    const event = require('../data/sample-sqs-event.json')
    await lambda.handler(event)
  })
})

const rewiredLambda = rewire('../../src/lambda/trade')
const status = require('../../src/wallet-status')
describe('buy', () => {
  it('should buy', async () => {
    const desiredSymbol = 'MLNBNB'
    const now = await status.handler()
    console.log('now: ', now)
    const buyOrSell = rewiredLambda.__get__('buyOrSell')
    const getQuantity = rewiredLambda.__get__('getQuantity')
    const quantity = await getQuantity(221, desiredSymbol)
    console.log('quantity: ', quantity)
    await buyOrSell(desiredSymbol, quantity, true)
  })
})
