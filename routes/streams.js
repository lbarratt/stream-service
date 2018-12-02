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
  const { state } = ctx

  state.session = ctx.get(HEADERS.SESSION)
  state.token = ctx.get(HEADERS.TOKEN)
  state.streamName = `${state.session}:${state.token}`
  state.streams = await state.redis.keys(`${state.session}:*`)
  state.existingToken = state.streams.find(stream => stream === state.streamName)

  if (state.token && !state.existingToken) {
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
  const { session, token, streamName, existingToken, redis } = ctx.state

  if (token && existingToken) {
    await redis.set(streamName, token, 'EX', STREAM_EXPIRY)

    ctx.body = {
      session,
      token
    }

    return
  }

  await next()
})

router.use('/', async (ctx, next) => {
  const { streams } = ctx.state

  if (streams && streams.length >= 3) {
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

    await redis.set(`${session}:${newToken}`, newToken, 'EX', STREAM_EXPIRY)

    ctx.body = {
      session,
      token: newToken
    }
  }
})

module.exports = router
