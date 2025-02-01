const fetch = require('node-fetch')

const GAS_URL = process.env.GAS_URL
const GAS_API_KEY = process.env.GAS_API_KEY

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

    const url = new URL(GAS_URL)
    
    // Determine method based on action type
    const isPostAction = [
      'login', 
      'register', 
      'submitCheckIn', 
      'submitCheckOut', 
      'submitForm',
      'submitExpenses'
    ].includes(action)

    const options = {
      method: isPostAction ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // Add action and API key to URL params
    url.searchParams.append('action', action)
    url.searchParams.append('key', GAS_API_KEY)

    // Handle data based on method
    if (data) {
      if (isPostAction) {
        // Handle base64 data for file uploads
        let processedData = { ...data }
        
        // Handle check-in photo
        if (action === 'submitCheckIn' && data.checkInPhoto) {
          const base64Data = data.checkInPhoto.split(',')[1] || data.checkInPhoto
          processedData.checkInPhoto = base64Data
        }
        
        // Handle check-out photo
        if (action === 'submitCheckOut' && data.checkOutPhoto) {
          const base64Data = data.checkOutPhoto.split(',')[1] || data.checkOutPhoto
          processedData.checkOutPhoto = base64Data
        }
        
        // Handle expense receipt
        if (action === 'submitExpenses' && data.receiptPhoto) {
          const base64Data = data.receiptPhoto.split(',')[1] || data.receiptPhoto
          processedData.receiptPhoto = base64Data
        }
        
        options.body = JSON.stringify({
          action,
          data: processedData
        })
      } else {
        // For GET requests, append data to URL params
        Object.entries(data).forEach(([key, value]) => {
          if (value) {
            // Handle date range parameter
            if (key === 'range' && Array.isArray(value)) {
              url.searchParams.append(key, value.join(','))
            } else {
              url.searchParams.append(key, value)
            }
          }
        })
      }
    }
    
    // Debug logs
    console.log('GAS Request Details:', {
      method: options.method,
      url: url.toString().replace(GAS_API_KEY, '***'), // Hide API key in logs
      action,
      data: isPostAction ? 'Data in body' : data
    })

    const response = await fetch(url.toString(), options)
    const responseText = await response.text()
    
    // Debug logs for raw response
    console.log('GAS Raw Response:', {
      status: response.status,
      text: responseText.substring(0, 1000) // Limit log size
    })

    // Special handling for activation response which returns plain text
    if (action === 'activateAccount') {
      if (responseText.includes('Token aktivasi tidak valid')) {
        return {
          success: false,
          message: 'Token aktivasi tidak valid'
        }
      }
      if (responseText.includes('Akun berhasil diaktivasi')) {
        return {
          success: true,
          message: 'Akun berhasil diaktivasi. Silakan login.'
        }
      }
    }

    // For other actions, parse JSON response
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Error parsing response:', parseError)
      console.log('Raw response that failed to parse:', responseText)
      throw new Error('Invalid JSON response from GAS')
    }
    
    // Debug logs for parsed response
    console.log('GAS Parsed Response:', {
      status: response.status,
      success: responseData.success,
      hasData: !!responseData.data,
      hasMessage: !!responseData.message
    })

    // Handle both success and error responses from GAS
    if (responseData.success === false) {
      throw new Error(responseData.message || 'GAS request failed')
    }
    
    // Special handling for responses with photo URLs
    if (['submitCheckIn', 'submitCheckOut'].includes(action)) {
      // Ensure photo URLs are properly formatted
      if (responseData.data?.checkInPhotoUrl) {
        responseData.data.checkInPhotoUrl = responseData.data.checkInPhotoUrl.replace(/\\/g, '')
      }
      if (responseData.data?.checkOutPhotoUrl) {
        responseData.data.checkOutPhotoUrl = responseData.data.checkOutPhotoUrl.replace(/\\/g, '')
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
