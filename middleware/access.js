module.exports = async (ctx, next) => {
  await next()

  ctx.logger.info(`Request completed`, {
    status: ctx.status,
    url: ctx.url,
    host: ctx.host,
    requestLength: ctx.request.length,
    responseLength: ctx.response.length,
    timestamp: (new Date().toJSON())
  })
}
