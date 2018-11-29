const request = require('supertest')

const app = require('./index')

describe('API Server', () => {
  it('Does something', async () => {
    const response = await request(app.callback())
      .get('/')

    expect(response.status).toBe(200)
  })
})
