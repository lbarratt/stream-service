const env = (name, fallback, transform) => {
  const value = process.env[name] || fallback || ''

  return transform ? transform(value) : value
}

module.exports = {
  STREAM_EXPIRY: env('LOG_LEVEL', 'debug'),
  STREAM_EXPIRY: env('STREAM_EXPIRY', '30', parseInt),
  REDIS_HOST: env('REDIS_HOST', 'redis'),
  REDIS_PORT: env('REDIS_PORT', '6379', parseInt),
  HEADERS: {
    SESSION: 'X-Stream-Session',
    TOKEN: 'X-Stream-Token'
  }
}

