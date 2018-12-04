const KoaRouter = require('koa-router')
const UUID = require('uuid/v4')

const redisMiddleware = require('../middleware/redis')
const sessionMiddleware = require('../middleware/session')
const { HEADERS, STREAM_EXPIRY } = require('../config')

const router = new KoaRouter()

router.prefix('/streams')
router.use(sessionMiddleware)
router.use(redisMiddleware)

router.use('/', async (ctx, next) => {
  const { state, logger } = ctx

  state.session = ctx.get(HEADERS.SESSION)
  state.token = ctx.get(HEADERS.TOKEN)
  state.timestamp = ctx.query.timestamp
  state.streamName = `${state.session}:${state.token}`
  state.streams = await state.redis.keys(`${state.session}:*`)
  state.existingToken = state.streams.find(stream => stream === state.streamName)

  if (state.token && !state.existingToken) {
    logger.info(`Token ${state.token} expired`)

    ctx.status = 401
    ctx.body = {
      errors: [
        {
          code: 3,
          message: 'Token expired'
        }
      ]
    }

    return
  }

  await next()
})

router.use('/', async (ctx, next) => {
  const { session, token, timestamp, streamName, existingToken, redis } = ctx.state

  if (token && existingToken) {
    const existingTimestamp = await redis.get(existingToken)

    if (timestamp !== existingTimestamp) {
      ctx.logger.info(`Mismatched timestamp for token: ${token}.`)

      ctx.status = 401
      ctx.body = {
        errors: [
          {
            code: 4,
            message: 'Timestamp does not match'
          }
        ]
      }

      return
    }

    ctx.logger.info(`Valid token for ${token} found.`)

    const refreshTimestamp = new Date().toJSON()
    await redis.set(streamName, refreshTimestamp, 'EX', STREAM_EXPIRY)

    ctx.body = {
      session,
      token,
      timestamp: refreshTimestamp
    }

    return
  }

  await next()
})

router.use('/', async (ctx, next) => {
  const { session, streams } = ctx.state

  if (streams && streams.length >= 3) {
    ctx.logger.info(`Session ${session} expired`)

    ctx.status = 401
    ctx.body = {
      errors: [
        {
          code: 2,
          message: 'Exceeded number of allowed sessions'
        }
      ]
    }

    return
  }

  await next()
})

router.get('/', async (ctx, next) => {
  const { session, token, redis } = ctx.state

  if (!token) {
    const newToken = UUID()
    const newTimestamp = new Date().toJSON()

    await redis.set(`${session}:${newToken}`, newTimestamp, 'EX', STREAM_EXPIRY)

    ctx.logger.info(`New token ${newToken} for session ${session} issued`)

    ctx.body = {
      session,
      token: newToken,
      timestamp: newTimestamp
    }
  }
})

module.exports = router
