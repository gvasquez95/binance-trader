const binanceRest = require('./binance/rest.js')
const fs = require('fs')

try {
  start(require('./status.json'))
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    console.log('No status file found, initializing')
    init().then(e => {
      e.date = Date.now()
      e.maxPrice = e.price
      e.maxDate = Date.now()
      writeStatus(e)
      start(e)
    })
  } else {
    console.log(e)
    throw e
  }
}

async function init () {
  const status = require('./wallet-status.js')
  return status.handler()
}

function start (status) {
  if (status) {
    console.log('status: ', JSON.stringify(status))
    evaluate(status).then()
  } else {
    console.error('No status found, aborting')
  }
}

const ACCEPTED_LOSS_MARGIN_PERCENT = 10
const ACCEPTED_BOUNCE_MARGIN_PERCENT = 20

async function evaluate (status) {
  const current = await binanceRest.tickerPrice(status.symbol)
  console.log('current: ', JSON.stringify(current))
  console.log(`margin: ${Math.round(100 * 100 * (current.price - status.price) / status.price) / 100}%`)
  if (current.price > status.price) {
    status.maxPrice = current.price
    status.maxDate = Date.now()
    console.log('New high price', status)
    writeStatus(status)
  } else if (current < (status.price * (100 - ACCEPTED_LOSS_MARGIN_PERCENT) / 100)) {
    console.log(`Loss greater than ${ACCEPTED_LOSS_MARGIN_PERCENT}, time to sell!`)
    await trade(status)
  } else if (current < (status.maxPrice * (100 - ACCEPTED_BOUNCE_MARGIN_PERCENT) / 100)) {
    console.log(`Bounce greater than ${ACCEPTED_BOUNCE_MARGIN_PERCENT}, time to sell!`)
    await trade(status)
  }
}

async function trade (status) {

}
function writeStatus (status) {
  fs.writeFile('./status.json', JSON.stringify(status), function (err) {
    if (err) return console.log(err)
    console.log('Status written')
  })
}
