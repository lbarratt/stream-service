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
  ctx.state.session = ctx.get(HEADERS.SESSION)
  ctx.state.token = ctx.get(HEADERS.TOKEN)
  ctx.state.streamName = `${ctx.state.session}:${ctx.state.token}`
  ctx.state.streams = await ctx.state.redis.keys(`${ctx.state.session}:*`)
  ctx.state.existingToken = ctx.state.streams.find(stream => stream === ctx.state.streamName)

  if (ctx.state.token && !ctx.state.existingToken) {
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
      token: existingToken
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
