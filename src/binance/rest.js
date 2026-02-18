const config = require('./config.json')
const Binance = require('binance-api-node').default

const client = Binance({
  apiKey: config.key,
  apiSecret: config.secret,
  httpBase: 'https://api.binance.com/',
  timeout: 15000,
  recvWindow: 10000
})

// Wrapper to maintain backwards compatibility with the old 'binance' package API
const binanceRest = {
  // Returns account info - same format as old API
  async account () {
    return client.accountInfo()
  },

  // Returns ticker price(s)
  // Old API: tickerPrice(symbol) returns { symbol, price }
  //          tickerPrice({}) or tickerPrice() returns [{ symbol, price }, ...]
  //          tickerPrice({ symbol }) returns { symbol, price }
  // New API: prices({ symbol }) returns { SYMBOL: 'price' }
  async tickerPrice (symbolOrOptions) {
    // Handle no argument or empty object - return all prices
    if (symbolOrOptions === undefined || (typeof symbolOrOptions === 'object' && Object.keys(symbolOrOptions).length === 0)) {
      const prices = await client.prices()
      return Object.entries(prices).map(([symbol, price]) => ({ symbol, price }))
    }

    // Handle string argument - single symbol
    if (typeof symbolOrOptions === 'string') {
      const prices = await client.prices({ symbol: symbolOrOptions })
      return { symbol: symbolOrOptions, price: prices[symbolOrOptions] }
    }

    // Handle object with symbol property - single symbol
    if (typeof symbolOrOptions === 'object' && symbolOrOptions.symbol) {
      const symbol = symbolOrOptions.symbol
      const prices = await client.prices({ symbol })
      return { symbol, price: prices[symbol] }
    }

    // Fallback - return all prices
    const prices = await client.prices()
    return Object.entries(prices).map(([symbol, price]) => ({ symbol, price }))
  },

  // Returns 24hr ticker stats - same format as old API
  async ticker24hr () {
    return client.dailyStats()
  },

  // Returns exchange info
  async exchangeInfo () {
    return client.exchangeInfo()
  },

  // Create a new order
  async newOrder (options) {
    return client.order(options)
  },

  // Test a new order (validation only, no actual order placed)
  async testOrder (options) {
    return client.orderTest(options)
  }
}

module.exports = binanceRest
