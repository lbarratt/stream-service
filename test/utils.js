const Redis = require('ioredis')

const { REDIS_HOST, REDIS_PORT } = require('../config')

const getRedisConnection = () => {
  return new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT
  })
}

const flushRedis = async () => {
  const redis = getRedisConnection()
  await redis.flushdb()
  await redis.quit()
}

module.exports = {
  getRedisConnection,
  flushRedis
}
