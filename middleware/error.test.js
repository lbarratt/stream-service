const errorMiddleware = require('./error')

describe('Error handler middleware', () => {
  it('Calls the next middleware and logs errors', async () => {
    const next = () => {
      throw new Error('kaboom')
    }

    const ctx = {
      logger: {
        error: jest.fn()
      }
    }

    await errorMiddleware(ctx, next)

    expect(ctx.logger.error.mock.calls[0][0]).toBe('Request error: Error: kaboom',)
    expect(ctx.status).toBe(500)
    expect(ctx.body.errors[0].code).toBe(0)
  })
})
