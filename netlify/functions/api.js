const { fetchGas } = require('./utils/gas')
const { verifyToken, getTokenFromRequest, generateToken } = require('./utils/auth')
const { createResponse } = require('./utils/response')
const cacheService = require('./utils/cache')

// Routes yang memerlukan authentication
const PROTECTED_ROUTES = ['checkin', 'checkout', 'delivery', 'expenses']

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204)
  }

  try {
    const path = event.path.replace(/^\/api\/|^\/.netlify\/functions\/api\/?/, '').split('/')[0]
    const params = event.queryStringParameters || {}
    const body = event.body ? JSON.parse(event.body) : null
    const origin = event.headers.origin

    console.log('Request path:', path)
    console.log('Request params:', params)
    console.log('Request body:', body)

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

      if (body && decoded) {
        body.data = {
          ...body.data,
          username: decoded.email
        }
      }
    }

    let response

    switch (path) {
      case 'branches':
        response = await cacheService.getOrFetchBranches(fetchGas)
        break

      case 'vehicles':
        if (!params.branch) {
          return createResponse(400, {
            success: false,
            error: 'Branch parameter required'
          }, { origin })
        }
        response = await cacheService.getOrFetchVehicles(fetchGas, params.branch)
        break

      case 'invoices':
        if (!params.branch || !params.date) {
          return createResponse(400, {
            success: false,
            error: 'Branch dan date parameter diperlukan'
          }, { origin })
        }

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

        response = await cacheService.getOrFetchInvoices(
          fetchGas,
          params.branch,
          formattedDate,
          params.ranged === 'true'
        )
        break

      case 'expenses':
        // Handle expenses endpoints
        switch (event.httpMethod) {
          case 'GET':
            if (params.context) {
              // Get filtered expenses by context (e.g., vehicle plate)
              response = await fetchGas('getFilteredExpenses', {
                context: params.context,
                range: params.range
              })
            } else {
              // Get expenses by branch and category
              if (!params.branch) {
                return createResponse(400, {
                  success: false,
                  error: 'Parameter branch diperlukan'
                }, { origin })
              }
              response = await fetchGas('getExpenses', {
                branch: params.branch,
                category: params.category,
                range: params.range
              })
            }
            break

          case 'POST':
            // Submit new expense
            if (!body?.data) {
              return createResponse(400, {
                success: false,
                error: 'Data expenses diperlukan'
              }, { origin })
            }
            response = await fetchGas('submitExpenses', body.data)
            break

          default:
            return createResponse(405, {
              success: false,
              error: 'Method not allowed'
            }, { origin })
        }
        break

      case 'cache':
        if (!params.action) {
          return createResponse(400, {
            success: false,
            error: 'Cache action required'
          }, { origin })
        }

        switch (params.action) {
          case 'stats':
            return createResponse(200, {
              success: true,
              data: cacheService.getStats()
            }, { origin })

          case 'clear':
            if (!params.pattern) {
              return createResponse(400, {
                success: false,
                error: 'Pattern required for cache clear'
              }, { origin })
            }
            const cleared = cacheService.invalidateByPattern(params.pattern)
            return createResponse(200, {
              success: true,
              message: `Cleared ${cleared} cache entries matching pattern: ${params.pattern}`
            }, { origin })

          default:
            return createResponse(400, {
              success: false,
              error: 'Invalid cache action'
            }, { origin })
        }

      case 'login':
        response = await fetchGas('login', body?.data)
        if (response.success) {
          const userData = response.data
          const token = generateToken({
            email: userData.email,
            fullName: userData.fullName,
            role: userData.role,
            branch: userData.branch
          })
          response.data.token = token
        }
        break

      case 'register':
        response = await fetchGas('register', body?.data)
        break

      case 'activate':
        response = await fetchGas('activateAccount', { token: params.token })
        break

      case 'checkin':
        response = await fetchGas('submitCheckIn', body?.data)
        if (response.success && body?.data?.branch) {
          cacheService.invalidateByPattern(`invoice_${body.data.branch}`)
        }
        break

      case 'checkout':
        response = await fetchGas('submitCheckOut', body?.data)
        if (response.success && body?.data?.branch) {
          cacheService.invalidateByPattern(`invoice_${body.data.branch}`)
        }
        break

      case 'delivery':
        response = await fetchGas('submitForm', body?.data)
        break

      default:
        console.log('Path not found:', path)
        return createResponse(404, {
          success: false,
          error: 'Not found'
        }, { origin })
    }

    if (!response.success) {
      const statusCode = response.error?.includes('tidak ditemukan') ? 404 :
                        response.error?.includes('tidak lengkap') ? 400 :
                        500

      return createResponse(statusCode, response, { origin })
    }

    return createResponse(200, response, { origin })
  } catch (error) {
    console.error('API Error:', error)
    return createResponse(500, {
      success: false,
      error: error.message || 'Internal server error'
    }, { origin })
  }
}
