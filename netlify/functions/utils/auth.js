const jwt = require('jsonwebtoken')
const cookie = require('cookie')

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '24h'

// In-memory token blacklist (will be cleared on server restart)
const tokenBlacklist = new Set()

function generateToken(payload) {
  try {
    console.log('Generating token for payload:', {
      ...payload,
      password: '[REDACTED]'
    })
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
  } catch (error) {
    console.error('Error generating token:', error)
    return null
  }
}

function verifyToken(token) {
  try {
    console.log('Verifying token:', token.substring(0, 20) + '...')
    
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      console.log('Token is blacklisted')
      return null
    }
    
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log('Token verified successfully:', {
      ...decoded,
      password: '[REDACTED]'
    })
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error.message)
    return null
  }
}

function getTokenFromRequest(event) {
  try {
    // Log headers for debugging
    console.log('Request headers:', {
      ...event.headers,
      authorization: event.headers.authorization ? 
        event.headers.authorization.substring(0, 20) + '...' : 
        undefined,
      cookie: event.headers.cookie ? '[PRESENT]' : '[NOT PRESENT]'
    })

    // Check Authorization header first
    const authHeader = event.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('Token found in Authorization header')
      return token
    }
    
    // Then check cookies
    if (event.headers.cookie) {
      const cookies = cookie.parse(event.headers.cookie)
      if (cookies.token) {
        console.log('Token found in cookies')
        return cookies.token
      }
    }

    console.log('No token found in request')
    return null
  } catch (error) {
    console.error('Error getting token from request:', error)
    return null
  }
}

function createAuthCookie(token, isLogout = false) {
  try {
    console.log(`Creating ${isLogout ? 'logout' : 'auth'} cookie for token:`, token.substring(0, 20) + '...')
    return cookie.serialize('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: isLogout ? 0 : 86400 // 0 for logout (delete cookie), 24 hours otherwise
    })
  } catch (error) {
    console.error('Error creating auth cookie:', error)
    return null
  }
}

// Add token to blacklist
function blacklistToken(token) {
  try {
    console.log('Blacklisting token:', token.substring(0, 20) + '...')
    tokenBlacklist.add(token)
    return true
  } catch (error) {
    console.error('Error blacklisting token:', error)
    return false
  }
}

// Check if token is blacklisted
function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token)
}

// Helper function to extract user info from token
function getUserFromToken(token) {
  try {
    const decoded = verifyToken(token)
    if (!decoded) return null

    return {
      email: decoded.email,
      fullName: decoded.fullName,
      role: decoded.role,
      branch: decoded.branch
    }
  } catch (error) {
    console.error('Error getting user from token:', error)
    return null
  }
}

module.exports = {
  generateToken,
  verifyToken,
  getTokenFromRequest,
  createAuthCookie,
  getUserFromToken,
  blacklistToken,
  isTokenBlacklisted
}
