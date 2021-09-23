const status = require('../src/24hrs.js')

describe('Test 1', function () {
  this.timeout(200 * 180000)
  it('should work', async () => {
    await status.handler()
    console.log('Done')
  })
})
