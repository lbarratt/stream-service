const request = require('supertest')

const app = require('../index')
const { STREAM_EXPIRY, HEADERS } = require('../config')
const { getRedisConnection, flushRedis } = require('../test/utils')

describe('API Server | /streams', () => {
  beforeEach(flushRedis)

  it('When no session is sent, responds with 401', async () => {
    const response = await request(app.callback())
      .get('/streams')

    expect(response.status).toBe(401)
    expect(response.body.errors[0].code).toBe(1)
  })

  it('When a session is sent for the first time, it returns a new token and timestamp', async () => {
    const response = await request(app.callback())
      .get('/streams')
      .set(HEADERS.SESSION, 't3st')

    expect(response.status).toBe(200)
    expect(response.body.session).toBe('t3st')
    expect(response.body.token).toBeTruthy()
    expect(response.body.timestamp).toBeTruthy()
  })

  it('When a session is sent with a token that does not exists, it returns 401', async () => {
    const response = await request(app.callback())
      .get('/streams')
      .set(HEADERS.SESSION, 't3st')
      .set(HEADERS.TOKEN, 't0k3n')

    expect(response.status).toBe(401)
    expect(response.body.errors[0].code).toBe(3)
  })

  it('When a exceeding more than 3 sessions, it returns 401', async () => {
    const getToken = () => request(app.callback())
      .get('/streams')
      .set(HEADERS.SESSION, 't3st')

    await Promise.all(Array(3).fill().map(getToken))

    const response = await getToken()

    expect(response.status).toBe(401)
    expect(response.body.errors[0].code).toBe(2)
    expect(response.body.errors[0].message).toBeTruthy()
  })

  it('When a token timestamp does not match, it returns 401', async () => {
    const session = 't3st'

    const { body: { token, timestamp } } = await request(app.callback())
      .get('/streams')
      .set(HEADERS.SESSION, session)

    const response = await request(app.callback())
      .get(`/streams?timestamp=${new Date().toJSON()}`)
      .set(HEADERS.SESSION, session)
      .set(HEADERS.TOKEN, token)

    expect(response.status).toBe(401)
    expect(response.body.errors[0].code).toBe(4)
    expect(response.body.errors[0].message).toBeTruthy()
  })

  it('When sending a valid token, returns the token and refreshes the timestamp', async () => {
    const redis = getRedisConnection()
    const token = 't0k3n'
    const timestamp = new Date().toJSON()
    const streamKey = `t3st:${token}`

    await redis.set(streamKey, timestamp, 'EX', 10)

    const response = await request(app.callback())
      .get(`/streams?timestamp=${timestamp}`)
      .set(HEADERS.SESSION, 't3st')
      .set(HEADERS.TOKEN, token)

    const ttl = await redis.ttl(streamKey)
    await redis.quit()

    expect(response.status).toBe(200)
    expect(response.body.session).toBe('t3st')
    expect(response.body.token).toBe(token)
    expect(response.body.timestamp).not.toBe(timestamp)
    expect(ttl).toBe(STREAM_EXPIRY)
  })
})
