const Koa = require('koa')

const app = new Koa()
const port = 3000

app.use((ctx, next) => {
  ctx.body = 'Hello World'
})

app.listen({ port }, () => {
  console.log(`🚀 Server ready at http://localhost:${port}`)
})
