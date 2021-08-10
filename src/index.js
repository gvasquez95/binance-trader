const binanceRest = require('./binanceRest.js')

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
    for (const [key, value] of assets) {
      binanceRest.tickerPrice({}).then(data => {
        for (const asset of data) {
          if (asset.symbol === `${key}USDT`) {
            const local = value * asset.price
            console.log(key, asset, local)
            total += local
            console.log('Total: ', total)
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
