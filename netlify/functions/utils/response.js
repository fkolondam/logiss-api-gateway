function createResponse(statusCode, data, options = {}) {
  // Allow all origins in development mode
  const isDev = process.env.NODE_ENV === 'development'
  const allowedOrigins = isDev ? ['*'] : (process.env.ALLOWED_ORIGINS?.split(',') || [])
  const origin = options.origin || '*'
  
  const headers = {
    'Access-Control-Allow-Origin': isDev ? '*' : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    ...options.headers
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(data)
  }
}

module.exports = { createResponse }