const binanceRest = require('../binance/rest.js')

const awsConf = require('aws.json')
const YOUR_ACCESS_KEY_ID = awsConf.key
const YOUR_SECRET_ACCESS_KEY = awsConf.secret
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb')
const { NodeHttpHandler } = require('@smithy/node-http-handler')
const https = require('https')
const agent = new https.Agent({
  keepAlive: true,
  // Infinity is read as 50 sockets
  maxSockets: Infinity
})

const dynamoDBClient = new DynamoDBClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: YOUR_ACCESS_KEY_ID,
    secretAccessKey: YOUR_SECRET_ACCESS_KEY
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: agent
  })
})

const DYNAMODB_TABLE = 'binance-prices'
const documentClient = DynamoDBDocumentClient.from(dynamoDBClient)
console.log('cold start')
const TTL_IN_HOURS = 6
const TTL_IN_SECONDS = 60 * 60 * TTL_IN_HOURS

async function storeSingleBatch (items) {
  const params = {
    RequestItems: {
      [DYNAMODB_TABLE]: items
    }
  }
  return documentClient.send(new BatchWriteCommand(params))
}

const BATCH_SIZE = 25

async function storeInDynamo (data) {
  const now = Date.now()
  const ttl = TTL_IN_SECONDS + Math.round(now / 1000)
  let items = []
  console.log(data.length)
  const promises = []
  for (const [i, ticker] of data.entries()) {
    items.push({
      PutRequest: {
        Item: {
          symbol: ticker.symbol,
          timestamp: now,
          price: ticker.price,
          ttl
        }
      }
    })
    if (i % BATCH_SIZE === 0) {
      promises.push(storeSingleBatch(items))
      items = []
    }
  }
  return Promise.all(promises)
}

exports.handler = async (event) => {
  const data = await binanceRest.tickerPrice()
  const symbols = []
  for (const [i, ticker] of data.entries()) {
   symbols.push(ticker.symbol)
  }
  console.log(JSON.stringify(symbols))
  if (data) {
    // return storeInDynamo(data)
  }
}
