const { fetchGas } = require('./utils/gas')
const { verifyToken, getTokenFromRequest, generateToken, blacklistToken, createAuthCookie } = require('./utils/auth')
const { optimizedResponse } = require('./utils/optimizedResponse')
const cacheService = require('./utils/cache')
const config = require('./utils/config')
const logger = require('./utils/logger')

// Environment configuration
const ENV = process.env.NODE_ENV || 'development'

// Routes yang memerlukan authentication
const PROTECTED_ROUTES = ['checkin', 'checkout', 'delivery', 'expenses', 'available-invoices', 'invoices', 'invoice', 'packing-list']

// Validasi file upload
function validateFileUpload(data, fieldName) {
  if (!data[fieldName]) {
    throw new Error(`${fieldName} diperlukan`)
  }
  
  if (!data[fieldName].startsWith('data:image/')) {
    throw new Error(`Format ${fieldName} tidak valid. Gunakan base64 image dengan data URL`)
  }

  // Validate base64 content
  const base64Data = data[fieldName].split(',')[1]
  if (!base64Data) {
    throw new Error(`Format ${fieldName} tidak valid. Data base64 tidak ditemukan`)
  }

  return base64Data
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return optimizedResponse(204, null)
  }

  try {
    const path = event.path.replace(/^\/api\/|^\/.netlify\/functions\/api\/?/, '').split('/')[0]
    const params = event.queryStringParameters || {}
    const body = event.body ? JSON.parse(event.body) : null
    const origin = event.headers.origin

    logger.request(`${path.toUpperCase()} ${event.httpMethod}`)

    // Validate authentication for protected routes
    if (PROTECTED_ROUTES.includes(path)) {
      logger.debug('Auth Check for Protected Route', { path })
      
      const token = getTokenFromRequest(event)
      if (!token) {
        logger.warn('Auth Error: No token provided')
        return optimizedResponse(401, {
          success: false,
          error: 'Authentication required'
        }, { origin })
      }
      console.log('Token found in request')

      const decoded = verifyToken(token)
      if (!decoded) {
        logger.warn('Auth Error: Invalid or expired token')
        return optimizedResponse(401, {
          success: false,
          error: 'Invalid or expired token'
        }, { origin })
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000)
      if (decoded.exp <= now) {
        logger.warn('Auth Error: Token has expired')
        return optimizedResponse(401, {
          success: false,
          error: 'Token has expired'
        }, { origin })
      }

      logger.debug('Token verified successfully:', {
        email: decoded.email,
        role: decoded.role,
        branch: decoded.branch,
        expiresIn: new Date(decoded.exp * 1000).toISOString()
      })

      // Validate branch authorization
      const requestBranch = params.branch || body?.data?.branch
      if (requestBranch && decoded.branch.toUpperCase() !== requestBranch.toUpperCase()) {
        logger.warn('Auth Error: Branch mismatch', {
          tokenBranch: decoded.branch,
          requestBranch: requestBranch
        })
        return optimizedResponse(403, {
          success: false,
          error: 'Unauthorized access: Branch mismatch'
        }, { origin })
      }

      // Add username from token to request data
      if (body?.data) {
        body.data.username = decoded.email
        logger.debug('Added username to request:', decoded.email)
      }
    }

    let response

    switch (path) {
      case 'activate':
      if (!params.token) {
        return optimizedResponse(400, {
          success: false,
          error: 'Token aktivasi diperlukan'
        }, { origin })
      }
        response = await fetchGas('activate', { token: params.token })
        break

    case 'login':
      if (!body?.data?.email || !body?.data?.hashedPassword) {
        return optimizedResponse(400, {
          success: false,
          error: 'Email dan password diperlukan'
        }, { origin })
      }
      response = await fetchGas('login', body.data)
      
      // If login successful, generate JWT token
      if (response.success && response.data) {
        const token = generateToken({
          email: response.data.email,
          fullName: response.data.fullName,
          role: response.data.role,
          branch: response.data.branch
        })
        
        // Add token to response data
        response.data.token = token
      }
      break

    case 'logout':
      if (!body?.data?.email) {
        return optimizedResponse(400, {
          success: false,
          error: 'Email diperlukan'
        }, { origin })
      }

      // Get token from request
      const logoutToken = getTokenFromRequest(event)
      if (!logoutToken) {
        return optimizedResponse(401, {
          success: false,
          error: 'Token tidak ditemukan'
        }, { origin })
      }

      // Verify token
      const decodedLogout = verifyToken(logoutToken)
      if (!decodedLogout || decodedLogout.email !== body.data.email) {
        return optimizedResponse(401, {
          success: false,
          error: 'Token tidak valid'
        }, { origin })
      }

      response = await fetchGas('logout', body.data)
      
      if (response.success) {
        // Blacklist the token
        blacklistToken(logoutToken)
        
        // Create logout cookie (will delete the existing cookie)
        const logoutCookie = createAuthCookie(logoutToken, true)
        
        return optimizedResponse(200, response, { 
          origin,
          cookie: logoutCookie
        })
      }
      break

    case 'forgot-password':
      if (!body?.data?.email) {
        return optimizedResponse(400, {
          success: false,
          error: 'Email diperlukan'
        }, { origin })
      }
      response = await fetchGas('forgotPassword', body.data)
      break

    case 'reset-password':
      if (!body?.data?.token || !body?.data?.newPassword) {
        return optimizedResponse(400, {
          success: false,
          error: 'Token dan password baru diperlukan'
        }, { origin })
      }
      response = await fetchGas('resetPassword', body.data)
      break

      case 'register':
        if (!body?.data?.email || !body?.data?.hashedPassword || !body?.data?.fullName) {
          return optimizedResponse(400, {
            success: false,
            error: 'Email, password, dan nama lengkap diperlukan'
          }, { origin })
        }
        response = await fetchGas('register', body.data)
        break

      case 'available-invoices':
        if (!params.branch || !params.date) {
          return optimizedResponse(400, {
            success: false,
            error: 'Branch dan date parameter diperlukan'
          }, { origin })
        }

        const dateObj = new Date(params.date)
        if (isNaN(dateObj.getTime())) {
          return optimizedResponse(400, {
            success: false,
            error: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD'
          }, { origin })
        }

        const month = dateObj.getMonth() + 1
        const day = dateObj.getDate()
        const year = dateObj.getFullYear()
        const formattedDate = `${month}/${day}/${year}`

        response = await cacheService.getOrFetchData(
          'invoice',
          { branch: params.branch, date: formattedDate, range: params.range },
          fetchGas,
          'getAvailableInvoices'
        )
        break

      case 'delivery':
        switch (event.httpMethod) {
          case 'GET':
            // Handle get delivery by ID
            if (params.id) {
              response = await cacheService.getOrFetchData(
                'delivery',
                { id: params.id },
                fetchGas,
                'getDelivery'
              )
              break
            }

            // Handle get deliveries with context
            if (params.context) {
              if (!params.branch) {
                return optimizedResponse(400, {
                  success: false,
                  error: 'Parameter branch diperlukan'
                }, { origin })
              }
              response = await cacheService.getOrFetchData(
                'delivery',
                { context: params.context, branch: params.branch, range: params.range },
                fetchGas,
                'getDeliveriesContext'
              )
              break
            }

            // Handle get all deliveries
            if (!params.branch) {
              return optimizedResponse(400, {
                success: false,
                error: 'Parameter branch diperlukan'
              }, { origin })
            }
            response = await cacheService.getOrFetchData(
              'delivery',
              { branch: params.branch, range: params.range },
              fetchGas,
              'getDeliveries'
            )
            break

          case 'POST':
            if (!body?.data) {
              return optimizedResponse(400, {
                success: false,
                error: 'Data delivery diperlukan'
              }, { origin })
            }

            try {
              // Validate required fields
              const requiredFields = [
                'branch', 
                'helperName',
                'vehicleNumber', 
                'deliveryTime',
                'storeName',
                'storeAddress',
                'invoiceNumber',
                'invoiceAmount',
                'paymentType',
                'deliveryCheckinPhoto',
                'location'
              ]
              const missingFields = requiredFields.filter(field => !body.data[field])
              if (missingFields.length > 0) {
                throw new Error(`Data tidak lengkap. Field yang diperlukan: ${missingFields.join(', ')}`)
              }

              // Validate delivery time
              const deliveryTime = new Date(body.data.deliveryTime)
              if (isNaN(deliveryTime.getTime())) {
                throw new Error('Format waktu pengiriman tidak valid')
              }

              // Validate invoice amount
              if (typeof body.data.invoiceAmount !== 'number' || body.data.invoiceAmount <= 0) {
                throw new Error('Nilai faktur harus berupa angka positif')
              }

              // Validate payment type
              const validPaymentTypes = ['TUNAI', 'TRANSFER', 'CEK/GIRO', 'TANDA TERIMA FAKTUR']
              if (!validPaymentTypes.includes(body.data.paymentType)) {
                throw new Error('Tipe pembayaran tidak valid')
              }

              // Validate location
              if (!body.data.location.latitude || !body.data.location.longitude) {
                throw new Error('Data lokasi tidak lengkap')
              }

              if (typeof body.data.location.latitude !== 'number' || 
                  typeof body.data.location.longitude !== 'number') {
                throw new Error('Format lokasi tidak valid')
              }

              // Validate required photos
              validateFileUpload(body.data, 'deliveryCheckinPhoto')

              // Validate optional photos if provided
              if (body.data.deliveryPhoto) {
                validateFileUpload(body.data, 'deliveryPhoto')
              }
              if (body.data.paymentPhoto) {
                validateFileUpload(body.data, 'paymentPhoto')
              }

              response = await fetchGas('submitDelivery', body.data)
            } catch (error) {
              return optimizedResponse(400, {
                success: false,
                error: error.message
              }, { origin })
            }
            break

          default:
            return optimizedResponse(405, {
              success: false,
              error: 'Method not allowed'
            }, { origin })
        }
        break

      case 'expenses':
        switch (event.httpMethod) {
          case 'GET':
            if (params.context) {
              response = await cacheService.getOrFetchExpenses(fetchGas, {
                context: params.context,
                range: params.range
              })
            } else {
              if (!params.branch) {
                return optimizedResponse(400, {
                  success: false,
                  error: 'Parameter branch diperlukan'
                }, { origin })
              }
              response = await cacheService.getOrFetchExpenses(fetchGas, {
                branch: params.branch,
                category: params.category,
                range: params.range
              })
            }
            break

          case 'POST':
            if (!body?.data) {
              return optimizedResponse(400, {
                success: false,
                error: 'Data expenses diperlukan'
              }, { origin })
            }

            try {
              // Validate required fields
              const requiredFields = ['date', 'branch', 'licensePlate', 'category', 'subcategory', 'amount']
              const missingFields = requiredFields.filter(field => !body.data[field])
              if (missingFields.length > 0) {
                throw new Error(`Data tidak lengkap. Field yang diperlukan: ${missingFields.join(', ')}`)
              }

              // Validate amount
              if (typeof body.data.amount !== 'number' || body.data.amount <= 0) {
                throw new Error('Amount harus berupa angka positif')
              }

              // Validate date format
              const expenseDate = new Date(body.data.date)
              if (isNaN(expenseDate.getTime())) {
                throw new Error('Format tanggal tidak valid. Gunakan format YYYY-MM-DD')
              }

              // Validate receipt photo if provided
              if (body.data.receiptPhoto) {
                validateFileUpload(body.data, 'receiptPhoto')
              }

              response = await fetchGas('submitExpenses', body.data)
            } catch (error) {
              return optimizedResponse(400, {
                success: false,
                error: error.message
              }, { origin })
            }
            break

          default:
            return optimizedResponse(405, {
              success: false,
              error: 'Method not allowed'
            }, { origin })
        }
        break

      case 'checkin':
        if (!body?.data) {
          return optimizedResponse(400, {
            success: false,
            error: 'Data check-in diperlukan'
          }, { origin })
        }

        try {
          // Validate required fields
          const checkinRequired = ['branch', 'vehicleNumber', 'checkInTime', 'initialOdometer', 'checkInPhoto', 'location']
          const missingCheckin = checkinRequired.filter(field => !body.data[field])
          if (missingCheckin.length > 0) {
            throw new Error(`Data tidak lengkap. Field yang diperlukan: ${missingCheckin.join(', ')}`)
          }

          // Validate odometer value
          if (typeof body.data.initialOdometer !== 'number' || body.data.initialOdometer <= 0) {
            throw new Error('Nilai odometer harus berupa angka positif')
          }

          // Validate check-in time
          const checkInTime = new Date(body.data.checkInTime)
          if (isNaN(checkInTime.getTime())) {
            throw new Error('Format waktu check-in tidak valid')
          }

          // Validate odometer photo
          validateFileUpload(body.data, 'checkInPhoto')

          // Validate location
          if (!body.data.location.latitude || !body.data.location.longitude) {
            throw new Error('Data lokasi tidak lengkap')
          }

          if (typeof body.data.location.latitude !== 'number' || typeof body.data.location.longitude !== 'number') {
            throw new Error('Format lokasi tidak valid')
          }

          response = await fetchGas('submitCheckIn', body.data)
          
          // Map specific error messages to status codes
          if (!response.success) {
            if (response.error?.includes('Kendaraan sedang dalam perjalanan')) {
              return optimizedResponse(400, response, { origin })
            }
            if (response.error?.includes('Lokasi terlalu jauh')) {
              return optimizedResponse(400, {
                success: false,
                error: response.error,
                data: response.data // Include distance info
              }, { origin })
            }
          }
        } catch (error) {
          return optimizedResponse(400, {
            success: false,
            error: error.message
          }, { origin })
        }
        break

      case 'checkout':
        if (!body?.data) {
          return optimizedResponse(400, {
            success: false,
            error: 'Data check-out diperlukan'
          }, { origin })
        }

        try {
          // Validate required fields
          const checkoutRequired = ['sessionId', 'checkOutTime', 'finalOdometer', 'checkOutPhoto', 'location']
          const missingCheckout = checkoutRequired.filter(field => !body.data[field])
          if (missingCheckout.length > 0) {
            throw new Error(`Data tidak lengkap. Field yang diperlukan: ${missingCheckout.join(', ')}`)
          }

          // Validate odometer value
          if (typeof body.data.finalOdometer !== 'number' || body.data.finalOdometer <= 0) {
            throw new Error('Nilai odometer harus berupa angka positif')
          }

          // Validate check-out time
          const checkOutTime = new Date(body.data.checkOutTime)
          if (isNaN(checkOutTime.getTime())) {
            throw new Error('Format waktu check-out tidak valid')
          }

          // Validate odometer photo
          validateFileUpload(body.data, 'checkOutPhoto')

          // Validate location
          if (!body.data.location.latitude || !body.data.location.longitude) {
            throw new Error('Data lokasi tidak lengkap')
          }

          if (typeof body.data.location.latitude !== 'number' || typeof body.data.location.longitude !== 'number') {
            throw new Error('Format lokasi tidak valid')
          }

          response = await fetchGas('submitCheckOut', body.data)
          
          // Map specific error messages to status codes
          if (!response.success) {
            if (response.error?.includes('Session tidak ditemukan')) {
              return optimizedResponse(404, response, { origin })
            }
            if (response.error?.includes('Session sudah selesai')) {
              return optimizedResponse(400, response, { origin })
            }
            if (response.error?.includes('Odometer akhir harus lebih besar')) {
              return optimizedResponse(400, response, { origin })
            }
            if (response.error?.includes('Lokasi terlalu jauh')) {
              return optimizedResponse(400, {
                success: false,
                error: response.error,
                data: response.data // Include distance info
              }, { origin })
            }
          }
        } catch (error) {
          return optimizedResponse(400, {
            success: false,
            error: error.message
          }, { origin })
        }
        break

      case 'branches':
        response = await cacheService.getOrFetchBranches(fetchGas)
        break

      case 'vehicles':
        if (!params.branch) {
          return optimizedResponse(400, {
            success: false,
            error: 'Branch parameter required'
          }, { origin })
        }
        response = await cacheService.getOrFetchVehicles(fetchGas, params.branch)
        break

      case 'invoices':
        if (!params.branch || !params.date) {
          return optimizedResponse(400, {
            success: false,
            error: 'Branch dan date parameter diperlukan'
          }, { origin })
        }

        const invoiceDateObj = new Date(params.date)
        if (isNaN(invoiceDateObj.getTime())) {
          return optimizedResponse(400, {
            success: false,
            error: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD'
          }, { origin })
        }

        const invoiceMonth = invoiceDateObj.getMonth() + 1
        const invoiceDay = invoiceDateObj.getDate()
        const invoiceYear = invoiceDateObj.getFullYear()
        const invoiceFormattedDate = `${invoiceMonth}/${invoiceDay}/${invoiceYear}`

        response = await cacheService.getOrFetchInvoices(
          fetchGas,
          params.branch,
          invoiceFormattedDate,
          params.ranged === 'true'
        )
        break

      case 'cache':
        if (params.action === 'stats') {
          response = {
            success: true,
            data: cacheService.getStats()
          }
        } else {
          return optimizedResponse(400, {
            success: false,
            error: 'Invalid cache action'
          }, { origin })
        }
        break

      case 'invoice':
        if (!params.invoiceNo) {
          return optimizedResponse(400, {
            success: false,
            error: 'Parameter invoice number diperlukan'
          }, { origin })
        }

        // Get invoice data
        response = await fetchGas('getInvoice', { invoiceNo: params.invoiceNo })

        // Validate branch access if invoice is found
        if (response.success && response.data) {
          const token = getTokenFromRequest(event)
          const decoded = verifyToken(token)
          
          if (response.data.branchName.toUpperCase() !== decoded.branch.toUpperCase()) {
            return optimizedResponse(403, {
              success: false,
              error: 'Unauthorized access: Branch mismatch'
            }, { origin })
          }
        }
        break

      case 'packing-list':
        if (!params.branch || !params.date) {
          return optimizedResponse(400, {
            success: false,
            error: 'Branch dan date parameter diperlukan'
          }, { origin })
        }

        const packingListDate = new Date(params.date)
        if (isNaN(packingListDate.getTime())) {
          return optimizedResponse(400, {
            success: false,
            error: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD'
          }, { origin })
        }

        const packingListMonth = packingListDate.getMonth() + 1
        const packingListDay = packingListDate.getDate()
        const packingListYear = packingListDate.getFullYear()
        const formattedPackingListDate = `${packingListMonth}/${packingListDay}/${packingListYear}`

        response = await cacheService.getOrFetchData(
          'packing-list',
          { branch: params.branch, date: formattedPackingListDate },
          fetchGas,
          'getPackingList'
        )
        break

      default:
        return optimizedResponse(404, {
          success: false,
          error: 'Not found'
        }, { origin })
    }

    // Determine status code based on error message
    const statusCode = !response?.success ? (
      response?.error?.includes('tidak ditemukan') ? 404 :
      response?.error?.includes('tidak lengkap') || 
      response?.error?.includes('sedang dalam perjalanan') ||
      response?.error?.includes('sudah selesai') ||
      response?.error?.includes('harus lebih besar') ||
      response?.error?.includes('terlalu jauh') ? 400 : 500
    ) : 200;

    logger.response(response?.message || (response?.success ? 'Success' : 'Failed'), response)
    return optimizedResponse(statusCode, response, { origin })
  } catch (error) {
    logger.error('API Error:', error)
    return optimizedResponse(500, {
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { origin })
  }
}
