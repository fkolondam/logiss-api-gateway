const { fetchGas } = require('./utils/gas')
const { verifyToken, getTokenFromRequest } = require('./utils/auth')
const { createResponse } = require('./utils/response')

// Routes yang memerlukan authentication
const PROTECTED_ROUTES = ['checkin', 'delivery']

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204)
  }

  try {
    const path = event.path.split('/').pop()
    const params = event.queryStringParameters || {}
    const body = event.body ? JSON.parse(event.body) : null
    const origin = event.headers.origin

    // Check authentication untuk protected routes
    if (PROTECTED_ROUTES.includes(path)) {
      const token = getTokenFromRequest(event)
      if (!token) {
        return createResponse(401, { 
          success: false, 
          error: 'Authentication required' 
        }, { origin })
      }

      const decoded = verifyToken(token)
      if (!decoded) {
        return createResponse(401, { 
          success: false, 
          error: 'Invalid or expired token' 
        }, { origin })
      }
    }

    let gasAction
    let gasData = null

    switch (path) {
      case 'branches':
        gasAction = 'getBranchConfig'
        break
      case 'vehicles':
        gasAction = 'getVehicleData'
        gasData = { branch: params.branch }
        break
      case 'invoices':
        gasAction = 'getInvoiceList'
        gasData = { 
          branch: params.branch,
          date: params.date
        }
        break
      case 'login':
        gasAction = 'login'
        gasData = body?.data
        break
      case 'register':
        gasAction = 'register'
        gasData = body?.data
        break
      case 'checkin':
        gasAction = 'submitCheckIn'
        gasData = body?.data
        break
      case 'delivery':
        gasAction = 'submitForm'
        gasData = body?.data
        break
      default:
        return createResponse(404, { 
          success: false, 
          error: 'Not found' 
        }, { origin })
    }

    const gasResponse = await fetchGas(gasAction, gasData)
    
    if (!gasResponse.success) {
      return createResponse(500, gasResponse, { origin })
    }
    
    return createResponse(200, gasResponse, { origin })
  } catch (error) {
    console.error('API Error:', error)
    return createResponse(500, { 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { origin })
  }
}