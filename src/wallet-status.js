const binanceRest = require('./binance/rest.js')

const BASE_ASSET = 'USDT'

async function getAssets () {
  const data = await binanceRest.account()
  const assets = new Map()
  for (const balance of data.balances) {
    if (balance.free > 0 || balance.locked > 0) {
      assets.set(balance.asset, balance.free)
    }
  }
  return assets
}

async function getTopAsset() {
  const assets = await getAssets()
  const prices = await binanceRest.tickerPrice({})
  let total = 0; let topAsset; let topAmount
  for (const [key, value] of assets) {
    for (const asset of prices) {
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
  }
  console.log('topAsset', topAsset, topAmount)
  return topAsset
}

exports.handler = async () => {
  console.log('Top Asset: ',await getTopAsset())
}
