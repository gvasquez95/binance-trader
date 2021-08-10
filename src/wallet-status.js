const binanceRest = require('./binance/rest.js')

const BASE_ASSET = 'USDT'

binanceRest
  .account()
  .then(data => {
    let total = 0
    const assets = new Map()
    for (const balance of data.balances) {
      if (balance.free > 0 || balance.locked > 0) {
        assets.set(balance.asset, balance.free)
      }
    }
    let topAsset, topAmount
    for (const [key, value] of assets) {
      binanceRest.tickerPrice({}).then(data => {
        for (const asset of data) {
          if (asset.symbol === `${key}${BASE_ASSET}`) {
            const local = value * asset.price
            if (!topAsset || local > topAmount) {
              topAsset = asset.symbol
              topAmount = local
            }
            console.log(key, asset, local)
            total += local
            console.log('Total: ', total)
            break
          }
        }
      }).catch(err => {
        console.error(err)
      })
    }
  })
  .catch(err => {
    console.error(err)
  })

async function start () {

}
