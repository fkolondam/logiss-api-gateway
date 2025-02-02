const { fetchGas } = require('./utils/gas')
const { verifyToken, getTokenFromRequest } = require('./utils/auth')
const { createResponse } = require('./utils/response')

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

    // Validate authentication for protected routes
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

      // Add username from token to request data
      if (body?.data) {
        body.data.username = decoded.email
      }
    }

    let response

    switch (path) {
      case 'expenses':
        switch (event.httpMethod) {
          case 'GET':
            if (params.context) {
              response = await fetchGas('getFilteredExpenses', {
                context: params.context,
                range: params.range
              })
            } else {
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
            if (!body?.data) {
              return createResponse(400, {
                success: false,
                error: 'Data expenses diperlukan'
              }, { origin })
            }

            // Validate required fields
            const requiredFields = ['date', 'branch', 'licensePlate', 'category', 'subcategory', 'amount']
            const missingFields = requiredFields.filter(field => !body.data[field])
            if (missingFields.length > 0) {
              return createResponse(400, {
                success: false,
                error: `Data tidak lengkap. Field yang diperlukan: ${missingFields.join(', ')}`
              }, { origin })
            }

            // Validate amount
            if (typeof body.data.amount !== 'number' || body.data.amount <= 0) {
              return createResponse(400, {
                success: false,
                error: 'Amount harus berupa angka positif'
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

      case 'checkin':
        if (!body?.data) {
          return createResponse(400, {
            success: false,
            error: 'Data check-in diperlukan'
          }, { origin })
        }

        // Validate required fields including photo
        const checkinRequired = ['branch', 'vehicleNumber', 'checkInTime', 'initialOdometer', 'checkInPhoto', 'location']
        const missingCheckin = checkinRequired.filter(field => !body.data[field])
        if (missingCheckin.length > 0) {
          return createResponse(400, {
            success: false,
            error: `Data tidak lengkap. Field yang diperlukan: ${missingCheckin.join(', ')}`
          }, { origin })
        }

        response = await fetchGas('submitCheckIn', body.data)
        break

      case 'checkout':
        if (!body?.data) {
          return createResponse(400, {
            success: false,
            error: 'Data check-out diperlukan'
          }, { origin })
        }

        // Validate required fields including photo
        const checkoutRequired = ['sessionId', 'checkOutTime', 'finalOdometer', 'checkOutPhoto', 'location']
        const missingCheckout = checkoutRequired.filter(field => !body.data[field])
        if (missingCheckout.length > 0) {
          return createResponse(400, {
            success: false,
            error: `Data tidak lengkap. Field yang diperlukan: ${missingCheckout.join(', ')}`
          }, { origin })
        }

        response = await fetchGas('submitCheckOut', body.data)
        break

      case 'branches':
        response = await fetchGas('getBranchConfig')
        break

      case 'vehicles':
        if (!params.branch) {
          return createResponse(400, {
            success: false,
            error: 'Branch parameter required'
          }, { origin })
        }
        response = await fetchGas('getVehicleData', params.branch)
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

        response = await fetchGas(
          params.ranged === 'true' ? 'getRangedInvoiceList' : 'getInvoiceList',
          {
            branch: params.branch,
            date: formattedDate
          }
        )
        break

      default:
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
