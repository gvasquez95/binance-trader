const config = require('../config.json')
const api = require('binance')

const binanceRest = new api.BinanceRest({
  key: config.key, // Get this from your account on binance.com
  secret: config.secret, // Same for this
  timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
  recvWindow: 10000, // Optional, defaults to 5000, increase if you're getting timestamp errors
  disableBeautification: false,
  /*
       * Optional, default is false. Binance's API returns objects with lots of one letter keys.  By
       * default those keys will be replaced with more descriptive, longer ones.
       */
  handleDrift: false,
  /*
       * Optional, default is false.  If turned on, the library will attempt to handle any drift of
       * your clock on it's own.  If a request fails due to drift, it'll attempt a fix by requesting
       * binance's server time, calculating the difference with your own clock, and then reattempting
       * the request.
       */
  baseUrl: 'https://api.binance.com/',
  /*
       * Optional, default is 'https://api.binance.com/'. Can be useful in case default url stops working.
       * In february 2018, Binance had a major outage and when service started to be up again, only
       * https://us.binance.com was working.
       */
  requestOptions: {}
  /*
       * Options as supported by the 'request' library
       * For a list of available options, see:
       * https://github.com/request/request
       */
})

module.exports = binanceRest
