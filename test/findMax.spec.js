const data = require('./24hr.json')

describe('Test 1', function () {
  this.timeout(200 * 180000)
  it('should work', async () => {
    let maxChange = 0
    let symbol
    for (const item of data) {
      if (item.priceChangePercent > maxChange) {
        maxChange = item.priceChangePercent
        symbol = item.symbol
      }
    }
    console.log('symbol: ', symbol)
    console.log('maxChange: ', maxChange)
  })
})
