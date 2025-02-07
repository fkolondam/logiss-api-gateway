const fetch = require('node-fetch')
const cache = require('./cache')

const GAS_URL = process.env.GAS_URL
const GAS_API_KEY = process.env.GAS_API_KEY

// List of actions that use POST method
const POST_ACTIONS = [
  'login', 
  'register',
  'submitCheckIn',
  'submitCheckOut',
  'submitDelivery',
  'submitExpenses',
  'logout',
  'forgotPassword',
  'resetPassword'
]

// List of actions that use caching
const CACHED_ACTIONS = [
  'getAvailableInvoices',
  'getBranchConfig',
  'getVehicleData',
  'getDeliveries',
  'getDeliveriesContext',
  'getDelivery',
  'getExpenses',
  'getFilteredExpenses',
  'activate',
  'getInvoice'
]

// Cache duration in seconds
const CACHE_DURATION = {
  getAvailableInvoices: 3600,    // 1 hour
  getBranchConfig: 86400,        // 24 hours
  getVehicleData: 43200,         // 12 hours
  getDeliveries: 1800,           // 30 minutes
  getDeliveriesContext: 1800,    // 30 minutes
  getDelivery: 1800,             // 30 minutes
  getExpenses: 1800,             // 30 minutes
  getFilteredExpenses: 1800,     // 30 minutes
  activate: 86400,               // 24 hours since activation tokens don't change frequently
  getInvoice: 1800              // 30 minutes
}

// File upload configurations
const FILE_TYPES = {
  checkInPhoto: 'odometerCheckin',
  checkOutPhoto: 'odometerCheckout',
  receiptPhoto: 'receiptPhoto',
  deliveryCheckinPhoto: 'deliveryCheckinPhoto',
  deliveryPhoto: 'deliveryPhoto',
  paymentPhoto: 'paymentPhoto'
}

async function fetchGas(action, data = null) {
  try {
    if (!GAS_URL) {
      console.error('GAS_URL is not configured')
      throw new Error('GAS_URL is not configured')
    }

    if (!GAS_API_KEY) {
      console.error('GAS_API_KEY is not configured')
      throw new Error('GAS_API_KEY is not configured')
    }

    // Check cache for GET requests
    if (!POST_ACTIONS.includes(action) && CACHED_ACTIONS.includes(action)) {
      const cacheKey = `${action}_${JSON.stringify(data)}`
      const cachedResponse = await cache.get(cacheKey)
      if (cachedResponse) {
        console.log(`Cache hit for ${action}`)
        return cachedResponse
      }
    }

    const url = new URL(GAS_URL)
    const isPostAction = POST_ACTIONS.includes(action)

    // Setup request options
    const options = {
      method: isPostAction ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // Add API key to all requests
    url.searchParams.append('key', GAS_API_KEY)

    if (isPostAction) {
      // Handle POST requests
      let processedData = { ...data }

      // Process file uploads
      Object.entries(FILE_TYPES).forEach(([field, fileType]) => {
        if (data[field]) {
          // Remove data URL prefix if exists
          const base64Data = data[field].replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
          processedData[field] = base64Data

          console.log(`Processing ${fileType}:`, {
            hasPhoto: true,
            dataLength: base64Data.length,
            sampleStart: base64Data.substring(0, 50)
          })
        }
      })

      // Format dates to UTC string
      if (action === 'submitCheckIn' && processedData.checkInTime) {
        processedData.checkInTime = new Date(processedData.checkInTime).toISOString()
      }
      if (action === 'submitCheckOut' && processedData.checkOutTime) {
        processedData.checkOutTime = new Date(processedData.checkOutTime).toISOString()
      }
      if (action === 'submitDelivery' && processedData.deliveryTime) {
        processedData.deliveryTime = new Date(processedData.deliveryTime).toISOString()
      }

      // Add action to body for POST requests
      options.body = JSON.stringify({
        action,
        data: processedData
      })
    } else {
      // Handle GET requests
      url.searchParams.append('action', action)
      
      // Add data as URL parameters for GET requests
      if (data) {
        // For getVehicleData, data is the branch string directly
        if (action === 'getVehicleData') {
          url.searchParams.append('branch', decodeURIComponent(data))
        } else {
          Object.entries(data).forEach(([key, value]) => {
            if (value) {
              if (key === 'range' && Array.isArray(value)) {
                url.searchParams.append(key, value.join(','))
              } else {
                url.searchParams.append(key, value)
              }
            }
          })
        }
      }
    }
    
    // Debug logs
    console.log('=== GAS Request Details ===')
    console.log('Action:', action)
    console.log('Method:', options.method)
    console.log('URL:', url.toString().replace(GAS_API_KEY, '[REDACTED]'))
    if (options.body) {
      const parsedBody = JSON.parse(options.body)
      console.log('Request Body:', {
        ...parsedBody,
        data: parsedBody.data ? {
          ...parsedBody.data,
          hashedPassword: parsedBody.data.hashedPassword ? '[REDACTED]' : undefined
        } : undefined
      })
    }

    const response = await fetch(url.toString(), options)
    const responseText = await response.text()
    
    // Debug logs for response
    console.log('=== GAS Response Details ===')
    console.log('Status:', response.status)
    console.log('Raw Response:', responseText.length > 1000 ? 
      `${responseText.substring(0, 1000)}... [truncated]` : 
      responseText
    )

    // Handle HTML error responses
    if (responseText.includes('<!DOCTYPE html>')) {
      console.error('GAS returned HTML error:', responseText)
      const errorMatch = responseText.match(/TypeError: (.+?)\(/);
      if (errorMatch) {
        throw new Error(errorMatch[1].trim());
      }
      throw new Error('Server returned HTML error response');
    }

    // Parse JSON response
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Error parsing response:', parseError)
      console.log('Raw response that failed to parse:', responseText)
      throw new Error('Invalid JSON response from GAS')
    }
    
    // Debug logs for parsed response
    console.log('=== GAS Parsed Response ===')
    console.log('Success:', responseData.success)
    console.log('Has Data:', !!responseData.data)
    console.log('Has Message:', !!responseData.message)
    if (!responseData.success) {
      console.log('Error:', responseData.message || 'No error message')
    }

    // Handle error responses
    if (responseData.success === false) {
      // Return error with original message and any additional data
      return {
        success: false,
        error: responseData.message || 'GAS request failed',
        data: responseData.data // Include any additional error data
      }
    }

    // For login responses, just pass through the data as-is
    if (action === 'login' && responseData.success) {
      console.log('=== Login Response Analysis ===')
      console.log('Raw response structure:', JSON.stringify(responseData, null, 2))

      // The GAS script's handleLogin doesn't return a token, 
      // so we'll just pass through the data as-is
      return {
        success: true,
        data: responseData.data
      }
    }

    // Cache successful GET responses
    if (!POST_ACTIONS.includes(action) && CACHED_ACTIONS.includes(action)) {
      const cacheKey = `${action}_${JSON.stringify(data)}`
      const duration = CACHE_DURATION[action] || 3600 // Default 1 hour
      
      // Special handling for vehicle data to ensure proper structure
      if (action === 'getVehicleData') {
        await cache.set(cacheKey, {
          success: true,
          data: {
            vehicles: responseData.data?.vehicles || []
          }
        }, duration)
      } else {
        await cache.set(cacheKey, {
          success: true,
          data: responseData.data || responseData
        }, duration)
      }
    }
    
    // Special handling for expenses responses
    if (action.startsWith('get') && action.includes('Expenses')) {
      const expenses = responseData.data?.expenses || []
      expenses.forEach(expense => {
        if (typeof expense.amount === 'string') {
          expense.amount = parseFloat(expense.amount)
        }
        if (expense.date) {
          const dateObj = new Date(expense.date)
          expense.date = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`
        }
        if (expense.receiptPhotoUrl) {
          expense.receiptPhotoUrl = expense.receiptPhotoUrl.replace(/\\/g, '')
        }
      })
    }

    // Special handling for delivery responses
    if (action.startsWith('get') && action.includes('Deliver')) {
      // Clean up photo URLs
      const deliveries = responseData.data?.deliveries || []
      deliveries.forEach(delivery => {
        if (delivery.checkinPhotoUrl) {
          delivery.checkinPhotoUrl = delivery.checkinPhotoUrl.replace(/\\/g, '')
        }
        if (delivery.deliveryPhotoUrl) {
          delivery.deliveryPhotoUrl = delivery.deliveryPhotoUrl.replace(/\\/g, '')
        }
        if (delivery.paymentPhotoUrl) {
          delivery.paymentPhotoUrl = delivery.paymentPhotoUrl.replace(/\\/g, '')
        }
        if (typeof delivery.invoiceAmount === 'string') {
          delivery.invoiceAmount = parseFloat(delivery.invoiceAmount)
        }
      })
    }

    // Special handling for available invoices
    if (action === 'getAvailableInvoices') {
      const invoices = responseData.data?.invoices || []
      invoices.forEach(invoice => {
        if (typeof invoice.amount === 'string') {
          invoice.amount = parseFloat(invoice.amount)
        }
        if (invoice.date) {
          const dateObj = new Date(invoice.date)
          invoice.date = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`
        }
      })
    }

    return {
      success: true,
      data: responseData.data || responseData
    }
  } catch (error) {
    console.error(`GAS Error (${action}):`, error)
    return {
      success: false,
      error: error.message || 'Internal server error'
    }
  }
}

module.exports = { fetchGas }
