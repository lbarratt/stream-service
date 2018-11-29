const Koa = require('koa')

const streamsRoutes = require('./routes/streams')

const app = new Koa()
const port = 3000

app.use(streamsRoutes.routes())

app.use((ctx, next) => {
  ctx.body = 'OK'
})

if (process.env.NODE_ENV !== 'test') {
  app.listen({ port }, () => {
    console.log(`🚀 Server ready at http://localhost:${port}`)
  })
}

module.exports = app
