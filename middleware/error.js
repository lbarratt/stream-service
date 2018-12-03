module.exports = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.logger.error(`Request error: ${err}`, {
      stacktrace: err.stack
    })

    ctx.status = 500
    ctx.body = {
      errors: [
        {
          code: 0,
          message: "An unexpected error occurred."
        }
      ]
    }
  }
}
