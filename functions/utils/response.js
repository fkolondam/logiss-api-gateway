function createResponse(statusCode, data, options = {}) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
    const origin = options.origin || '*'
    
    const headers = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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