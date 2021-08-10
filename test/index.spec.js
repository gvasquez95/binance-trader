const status = require('../src/wallet-status.js')

describe('Test 1', function () {
  this.timeout(200 * 180000)
  it('should work', async () => {
    await status.handler()
    console.log('Done')
  })
})
