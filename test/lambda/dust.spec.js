const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const lambda = require('../../src/lambda/dust')
describe('dust should be converted', () => {
  it('lambda should run', async () => {
    await lambda.handler()
  })
})
