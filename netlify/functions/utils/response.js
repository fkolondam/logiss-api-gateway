function createResponse(statusCode, data, options = {}) {
  // Allow all origins in development mode
  const isDev = process.env.NODE_ENV === 'development'
  const allowedOrigins = isDev ? ['*'] : (process.env.ALLOWED_ORIGINS?.split(',') || [])
  const origin = options.origin || '*'
  
  // Debug logs
  console.log('Creating response:', {
    statusCode,
    data,
    origin,
    isDev,
    allowedOrigins
  })
  
  const headers = {
    'Access-Control-Allow-Origin': isDev ? '*' : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    ...options.headers
  }

  // For error responses, ensure we have a consistent format
  if (statusCode >= 400) {
    const errorResponse = {
      success: false,
      error: typeof data === 'string' ? data : data.error || data.message || 'Unknown error',
      details: data.details || undefined
    }
    return {
      statusCode,
      headers,
      body: JSON.stringify(errorResponse)
    }
  }

  // For success responses, ensure we have a consistent format
  const successResponse = {
    success: true,
    ...(typeof data === 'object' && data !== null ? 
      (data.data ? data : { data }) : 
      { data })
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(successResponse)
  }
}

module.exports = { createResponse }
