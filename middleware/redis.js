const Redis = require('ioredis')

const { REDIS_HOST, REDIS_PORT } = require('../config')

module.exports = async (ctx, next) => {
  ctx.state.redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT
  })

  await next()
  await ctx.state.redis.quit()
}
