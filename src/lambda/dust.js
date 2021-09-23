const binanceRest = require('../binance/rest.js')

exports.handler = async (event) => {
  const quantity = 1000
  const res = await binanceRest.testOrder({ symbol: 'PROSETH', side: 'SELL', type: 'MARKET', quantity })
  console.log('order: ', JSON.stringify(res))
}
