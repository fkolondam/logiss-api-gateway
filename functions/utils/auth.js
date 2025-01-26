const jwt = require('jsonwebtoken')
const cookie = require('cookie')

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '24h'

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

function getTokenFromRequest(event) {
  // Check Authorization header first
  const authHeader = event.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Then check cookies
  const cookies = cookie.parse(event.headers.cookie || '')
  return cookies.token
}

function createAuthCookie(token) {
  return cookie.serialize('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 86400 // 24 hours
  })
}

module.exports = {
  generateToken,
  verifyToken,
  getTokenFromRequest,
  createAuthCookie
}