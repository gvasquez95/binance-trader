const binanceRest = require('../binance/rest.js')
const status = require('../wallet-status')

const round = (n, dp) => {
  const h = +('1'.padEnd(dp + 1, '0'))
  return Math.round(n * h) / h
}

let exchangeInfo
async function getExchangeInfo () {
  if (!exchangeInfo) exchangeInfo = await binanceRest.exchangeInfo()
  return exchangeInfo
}

async function normalize (symbol, quantity) {
  const info = await getExchangeInfo()
  for (const ticker of info.symbols) {
    if (ticker.symbol === symbol) {
      // console.log(ticker)
      const decimalPlaces = ticker.baseAssetPrecision
      for (const filter of ticker.filters) {
        if (filter.filterType === 'LOT_SIZE') {
          const stepSize = filter.stepSize
          const normalized = (stepSize * Math.trunc(quantity / stepSize)) - 0 * stepSize
          return round(normalized, decimalPlaces)
        }
      }
    }
  }
  return 0
}

async function symbolExists (symbol) {
  const info = await getExchangeInfo()
  return info.symbols.some(ticker => ticker.symbol === symbol)
}

async function getQuantity (available, symbol) {
  const btcTicker = await binanceRest.tickerPrice({ symbol })
  return normalize(symbol, available / btcTicker.price)
}

function getCurrentData () {
  return status.handler()
}
const BASE_SYMBOLS = ['ETH', 'USDT', 'BTC', 'BNB', 'BUSD']

function getBaseSymbol (symbol) {
  for (const item of BASE_SYMBOLS) {
    if (symbol.endsWith(item)) {
      return item
    }
  }
  console.log('No matching base symbol for: ', symbol)
}

function extractAssetFromSymbol (symbol) {
  for (const item of BASE_SYMBOLS) {
    if (symbol.endsWith(item)) {
      return symbol.slice(0, -item.length)
    }
  }
  return null
}

async function getValidBaseSymbol (symbol) {
  const asset = extractAssetFromSymbol(symbol)
  if (!asset) {
    console.log('Could not extract asset from symbol: ', symbol)
    return null
  }

  const originalBase = getBaseSymbol(symbol)
  const originalPair = `${asset}${originalBase}`
  if (await symbolExists(originalPair)) {
    return originalBase
  }

  console.log(`Symbol ${originalPair} does not exist, trying alternative base symbols`)
  for (const baseSymbol of BASE_SYMBOLS) {
    if (baseSymbol === originalBase) continue
    const alternativePair = `${asset}${baseSymbol}`
    if (await symbolExists(alternativePair)) {
      console.log(`Found valid alternative pair: ${alternativePair}`)
      return baseSymbol
    }
  }

  console.log(`No valid trading pair found for asset: ${asset}`)
  return null
}

function getIntermediate (currentSymbol, desiredSymbol) {
  const part1 = getBaseSymbol(desiredSymbol)
  console.log('part1: ', part1)
  if (!part1) return
  const part2 = getBaseSymbol(currentSymbol)
  console.log('part2: ', part2)
  if (!part2) return
  if (part1 === part2) { return '' } else {
    return `${part1}${part2}`
  }
}

async function trade (currentSymbol, quantity, desiredSymbol) {
  if (currentSymbol === desiredSymbol) {
    console.log('Not changing symbols, stopping')
    return
  }
  if (currentSymbol !== 'USDT') {
    await sell(currentSymbol, await normalize(currentSymbol, quantity))
  }
  const intermediate = getIntermediate(currentSymbol, desiredSymbol)
  console.log('Intermediate: ', intermediate)
  if (intermediate && intermediate !== '') {
    const data = await getCurrentData()
    await buy(intermediate, data.quantity)
  }
  const data = await getCurrentData()
  await buy(desiredSymbol, data.quantity)
}

async function sell (symbol, quantity) {
  console.log('Sell ', symbol, quantity)

  // Check quantity is valid before proceeding
  if (quantity <= 0) {
    console.log('Warning: Skipping sell for', symbol, '- quantity is', quantity, '(must be greater than 0)')
    return
  }

  // Validate symbol exists before attempting to sell
  if (!await symbolExists(symbol)) {
    console.log(`Symbol ${symbol} does not exist in exchange, attempting fallback`)
    const asset = extractAssetFromSymbol(symbol)
    if (!asset) {
      const errorMsg = `Cannot sell: Invalid symbol format ${symbol}`
      console.log(errorMsg)
      throw new Error(errorMsg)
    }

    // Try alternative base symbols
    const validBase = await getValidBaseSymbol(symbol)
    if (validBase) {
      const alternativeSymbol = `${asset}${validBase}`
      console.log(`Using alternative symbol: ${alternativeSymbol}`)
      const normalizedQuantity = await normalize(alternativeSymbol, quantity)
      if (normalizedQuantity === 0) {
        const errorMsg = `Cannot sell: Unable to normalize quantity for ${alternativeSymbol}`
        console.log(errorMsg)
        throw new Error(errorMsg)
      }
      const res = await binanceRest.newOrder({ symbol: alternativeSymbol, side: 'SELL', type: 'MARKET', quantity: normalizedQuantity })
      return res
    }

    const errorMsg = `Cannot sell: No valid trading pair found for asset ${asset}`
    console.log(errorMsg)
    throw new Error(errorMsg)
  }

  try {
    const res = await binanceRest.newOrder({ symbol: symbol, side: 'SELL', type: 'MARKET', quantity })
    return res
  } catch (err) {
    if (err.code === -1013) {
      console.log(`Market is closed error (-1013) for symbol ${symbol}, attempting fallback`)
      const asset = extractAssetFromSymbol(symbol)
      if (!asset) {
        console.log(`Cannot extract asset from symbol: ${symbol}`)
        throw err
      }

      // Try alternative base symbols
      for (const baseSymbol of BASE_SYMBOLS) {
        if (symbol.endsWith(baseSymbol)) continue
        const alternativeSymbol = `${asset}${baseSymbol}`
        if (await symbolExists(alternativeSymbol)) {
          console.log(`Retrying with alternative symbol: ${alternativeSymbol}`)
          try {
            const normalizedQuantity = await normalize(alternativeSymbol, quantity)
            if (normalizedQuantity === 0) {
              console.log(`Unable to normalize quantity for ${alternativeSymbol}, skipping`)
              continue
            }
            const res = await binanceRest.newOrder({ symbol: alternativeSymbol, side: 'SELL', type: 'MARKET', quantity: normalizedQuantity })
            return res
          } catch (retryErr) {
            console.log(`Failed to sell with ${alternativeSymbol}: ${JSON.stringify(retryErr)}`)
            continue
          }
        }
      }

      console.log(`All alternative pairs exhausted for asset ${asset}`)
      throw err
    } else {
      console.log('Sell error: ', JSON.stringify(err))
      throw err
    }
  }
}

async function buy (symbol, quantity) {
  console.log('Buy ', symbol, quantity)
  let res
  try {
    res = await binanceRest.newOrder({ symbol: symbol, side: 'BUY', type: 'MARKET', quoteOrderQty: quantity })
  } catch (err) {
    if (err.code === -1013) {
      res = await binanceRest.newOrder({ symbol: symbol, side: 'BUY', type: 'MARKET', quantity: await getQuantity(0.95 * quantity, symbol) })
    } else {
      console.log('else: ', JSON.stringify(err))
      throw err
    }
  }
  return res
}
exports.handler = async (event, context) => {
  try {
    if (event && event.Records) {
      for (const record of event.Records) {
        const data = await getCurrentData()
        console.log('current:', JSON.stringify(data))
        if (data) {
          await trade(data.symbol, data.quantity, record.body)
        }
      }
    }
  } catch (err) {
    if (err.code === -1121) {
      // wrong symbol, retry once
      try {
        if (event && event.Records) {
          for (const record of event.Records) {
            const data = await getCurrentData()
            console.log('current:', JSON.stringify(data))
            if (data) {
              await trade(data.symbol, data.quantity, record.body)
            }
          }
        }
      } catch (err) {
        const msg = JSON.stringify(err)
        if (context) {
          console.log('retry handler err: ', msg)
          context.fail(msg)
        } else {
          console.log('retry handler err: ', msg)
          throw err
        }
      }
    } else {
      const msg = JSON.stringify(err)
      if (context) {
        console.log('handler err: ', msg)
        context.fail(msg)
      } else {
        console.log('handler err: ', msg)
        throw err
      }
    }
  }
}
