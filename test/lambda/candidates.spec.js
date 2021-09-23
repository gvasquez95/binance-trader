const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const lambda = require('../../src/lambda/candidates')
describe('read binance ticker prices in dynamodb', () => {
  it('lambda should run', async () => {
    await lambda.handler()
  })
})
