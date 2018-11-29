const request = require('supertest')

const app = require('./index')

describe('API Server', () => {
  it('Responds with 200 OK on the root path', async () => {
    const response = await request(app.callback())
      .get('/')

    expect(response.status).toBe(200)
    expect(response.text).toBe('OK')
  })
})
