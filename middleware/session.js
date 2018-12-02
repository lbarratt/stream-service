const { HEADERS } = require('../config')

module.exports = async (ctx, next) => {
  const session = ctx.get(HEADERS.SESSION)

  if (!session) {
    ctx.status = 401
    ctx.body = {
      errors: [
        {
          code: 1,
          message: 'No user session provided'
        }
      ]
    }

    return
  }

  await next()
}
