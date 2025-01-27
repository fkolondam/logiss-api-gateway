const { fetchGas } = require('./utils/gas')
const { verifyToken, getTokenFromRequest, generateToken } = require('./utils/auth')
const { createResponse } = require('./utils/response')

// Routes yang memerlukan authentication
const PROTECTED_ROUTES = ['checkin', 'checkout', 'delivery']

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204)
  }

  try {
    // Extract path dari URL, hapus '/api/' prefix jika ada
    const path = event.path.replace(/^\/api\/|^\/.netlify\/functions\/api\/?/, '').split('/')[0]
    const params = event.queryStringParameters || {}
    const body = event.body ? JSON.parse(event.body) : null
    const origin = event.headers.origin

    console.log('Request path:', path) // Untuk debugging
    console.log('Request body:', body) // Untuk debugging
    console.log('Request params:', params) // Untuk debugging

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

      // Add user info to body if it exists
      if (body && decoded) {
        body.data = {
          ...body.data,
          username: decoded.email
        }
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
        // Convert YYYY-MM-DD to M/D/YYYY
        const dateObj = new Date(params.date)
        if (isNaN(dateObj.getTime())) {
          return createResponse(400, {
            success: false,
            error: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD'
          }, { origin })
        }
        
        const month = dateObj.getMonth() + 1
        const day = dateObj.getDate()
        const year = dateObj.getFullYear()
        const formattedDate = `${month}/${day}/${year}`
        
        gasAction = 'getInvoiceList'
        gasData = { 
          branch: params.branch,
          date: formattedDate
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
      case 'activate':
        gasAction = 'activateAccount'
        gasData = { token: params.token }
        break
      case 'checkin':
        gasAction = 'submitCheckIn'
        gasData = body?.data
        break
      case 'checkout':
        gasAction = 'submitCheckOut'
        gasData = body?.data
        break
      case 'delivery':
        gasAction = 'submitForm'
        gasData = body?.data
        break
      default:
        console.log('Path not found:', path) // Untuk debugging
        return createResponse(404, { 
          success: false, 
          error: 'Not found' 
        }, { origin })
    }

    console.log('Calling GAS with action:', gasAction, 'and data:', gasData) // Untuk debugging

    const gasResponse = await fetchGas(gasAction, gasData)
    
    if (!gasResponse.success) {
      const statusCode = gasResponse.error?.includes('tidak ditemukan') ? 404 :
                        gasResponse.error?.includes('tidak lengkap') ? 400 :
                        500
      
      return createResponse(statusCode, gasResponse, { origin })
    }

    // Generate token for successful login
    if (path === 'login' && gasResponse.success) {
      const userData = gasResponse.data
      const token = generateToken({
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        branch: userData.branch
      })

      // Add token to response
      gasResponse.data.token = token
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
