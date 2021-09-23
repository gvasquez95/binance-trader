const binanceRest = require('./binance/rest.js')
const fs = require('fs')

async function getAssets () {
  const hist = await binanceRest.ticker24hr()
  console.log()
  fs.writeFile('./test/data/24hr.json', JSON.stringify(hist), function (err) {
    if (err) return console.log(err)
    console.log('Writing last 24 hr data for all symbols')
  })
}

exports.handler = async () => {
  console.log('Top Asset: ', await getAssets())
}
