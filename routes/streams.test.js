const request = require('supertest')

const app = require('../index')

describe('API Server | /streams', () => {
  it('Responds with 200', async () => {
    const response = await request(app.callback())
      .get('/streams')

    expect(response.status).toBe(200)
    expect(response.text).toBe('streams')
  })
})
