const createTrend = require('trendline')
const awsConf = require('./aws.json')
const YOUR_ACCESS_KEY_ID = awsConf.key
const YOUR_SECRET_ACCESS_KEY = awsConf.secret
const AWS = require('aws-sdk')
const http = require('https')
const agent = new http.Agent({
  keepAlive: true,
  // Infinity is read as 50 sockets
  maxSockets: Infinity
})

AWS.config.update({
  region: 'us-east-1',
  httpOptions: {
    agent
  }
})

const DYNAMODB_TABLE = 'binance-prices'
const sqs = new AWS.SQS({ accessKeyId: YOUR_ACCESS_KEY_ID, secretAccessKey: YOUR_SECRET_ACCESS_KEY, apiVersion: '2012-11-05' })
const documentClient = new AWS.DynamoDB.DocumentClient({ accessKeyId: YOUR_ACCESS_KEY_ID, secretAccessKey: YOUR_SECRET_ACCESS_KEY })
const tickers = require('../tickers.json')

const NUM_DECIMALS = 7

const round = (n, dp) => {
  const h = +('1'.padEnd(dp + 1, '0'))
  return Math.round(n * h) / h
}

async function getPriceChanges (since, breakpoint) {
  const changes = []
  for (const [i, ticker] of tickers.entries()) {
    if (!ticker.includes('BIDR') && !ticker.includes('BIFI')) {
      changes.push(getPriceChange(ticker, since, breakpoint))
    }
  }
  const res = await Promise.all(changes)
  let symbol
  let maxChange = 0
  let slope = 0
  for (const ticker of res) {
    if (ticker.percentChange > maxChange && ticker.slope > Math.pow(10, -1 * NUM_DECIMALS)) {
      maxChange = ticker.percentChange
      symbol = ticker.symbol
      slope = ticker.slope
    }
  }
  return { symbol, maxChange: Math.round(100 * maxChange) / 100, slope: round(slope, NUM_DECIMALS) }
}

async function getPriceChange (symbol, since, breakpoint) {
  const params = {
    TableName: DYNAMODB_TABLE,
    ProjectionExpression: '#timestamp, price',
    KeyConditionExpression: 'symbol = :symbol and #timestamp > :timestamp',
    ExpressionAttributeNames: {
      '#timestamp': 'timestamp'
    },
    ExpressionAttributeValues: {
      ':symbol': symbol,
      ':timestamp': since
    }
  }
  const res = await documentClient.query(params).promise()
  const prev = []
  const recent = []
  const trendData = []
  for (const data of res.Items) {
    if (data.timestamp < breakpoint) {
      prev.push(data.price)
    } else {
      trendData.push({ x: trendData.length, y: data.price })
      recent.push(data.price)
    }
  }
  let sumPrev = 0
  let sumRecent = 0
  for (const price of prev) { sumPrev += price }
  for (const price of recent) { sumRecent += price }
  const avgPrev = sumPrev / prev.length
  const avgRecent = sumRecent / recent.length
  const trend = createTrend(trendData, 'x', 'y')
  return { symbol, percentChange: (100 * (avgRecent - avgPrev)) / avgRecent, slope: trend.slope }
}
const ONE_MINUTE = 1000 * 60
const SAMPLE_PERIOD = ONE_MINUTE * 10 // in minutes
const SAFE_SYMBOL = 'BTCUSDT'
const CHANGE_THRESHOLD = 4 // percent
const SLOPE_THRESHOLD = 0.1
exports.handler = async (event) => {
  const now = Date.now()
  const TWO_PERIODS = now - 2 * SAMPLE_PERIOD
  const ONE_PERIOD = now - SAMPLE_PERIOD
  const changes = await getPriceChanges(TWO_PERIODS, ONE_PERIOD)
  console.log(JSON.stringify(changes))
  if (changes) {
    try {
      const QueueUrl = (await sqs.getQueueUrl({
        QueueName: 'binance-trader.fifo' /* required */
      }).promise()).QueueUrl
      const params = {
        MessageBody: changes.maxChange > CHANGE_THRESHOLD || changes.slope > SLOPE_THRESHOLD ? changes.symbol : SAFE_SYMBOL,
        MessageDeduplicationId: changes.symbol, // Required for FIFO queues
        MessageGroupId: 'binance', // Required for FIFO queues
        QueueUrl
      }
      await sqs.sendMessage(params).promise()
    } catch (err) { console.log('err: ', JSON.stringify(err)) }
  }
}
