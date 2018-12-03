const winston = require('winston')
const Koa = require('koa')

const accessMiddleware = require('./middleware/access')
const errorMiddleware = require('./middleware/error')
const streamsRoutes = require('./routes/streams')
const { LOG_LEVEL } = require('./config')

const app = new Koa()
const port = 3000

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test'
    })
  ]
});

app.context.logger = logger

app.use(accessMiddleware)
app.use(errorMiddleware)
app.use(streamsRoutes.routes())

app.use((ctx, next) => {
  ctx.body = 'OK'
})

if (process.env.NODE_ENV !== 'test') {
  app.listen({ port }, () => {
    app.context.logger.info(`🚀 Server ready at http://localhost:${port}`)
  })
}

module.exports = app
