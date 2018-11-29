const KoaRouter = require('koa-router')

const router = new KoaRouter()

router.get('/streams', (ctx, next) => {
  ctx.body = 'streams'
})

module.exports = router
