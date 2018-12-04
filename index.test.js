const request = require('supertest')

const app = require('./index')

describe('API Server', () => {
  it('Responds with 404 on the root path', async () => {
    const response = await request(app.callback())
      .get('/')

    expect(response.status).toBe(404)
  })
})
