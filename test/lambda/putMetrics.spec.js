const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const lambda = require('../../src/lambda/putMetrics')
describe('store binance ticker prices in dynamodb', () => {
  it('lambda should run', async () => {
    await lambda.handler()
  })
})
