const fetch = require('node-fetch')

const GAS_URL = process.env.GAS_URL
const GAS_API_KEY = process.env.GAS_API_KEY

// List of actions that use POST method
const POST_ACTIONS = [
  'login', 
  'register',
  'submitCheckIn',
  'submitCheckOut',
  'submitForm',
  'submitExpenses'
]

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
      switch (action) {
        case 'submitCheckIn':
          if (data.checkInPhoto) {
            // Remove data URL prefix if exists
            const base64Data = data.checkInPhoto.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
            processedData.checkInPhoto = base64Data
          }
          break;

        case 'submitCheckOut':
          if (data.checkOutPhoto) {
            const base64Data = data.checkOutPhoto.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
            processedData.checkOutPhoto = base64Data
          }
          break;

        case 'submitExpenses':
          if (data.receiptPhoto) {
            const base64Data = data.receiptPhoto.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
            processedData.receiptPhoto = base64Data
            console.log('Processing expense receipt:', {
              hasPhoto: true,
              dataLength: base64Data.length,
              sampleStart: base64Data.substring(0, 50)
            })
          }
          break;
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
    
    // Debug logs
    console.log('GAS Request Details:', {
      method: options.method,
      url: url.toString().replace(GAS_API_KEY, '***'),
      action,
      bodyPreview: options.body ? 'Request body present' : 'No body'
    })

    const response = await fetch(url.toString(), options)
    const responseText = await response.text()
    
    // Debug logs for raw response
    console.log('GAS Raw Response:', {
      status: response.status,
      text: responseText.substring(0, 1000)
    })

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
    console.log('GAS Parsed Response:', {
      status: response.status,
      success: responseData.success,
      hasData: !!responseData.data,
      hasMessage: !!responseData.message
    })

    // Handle error responses
    if (responseData.success === false) {
      throw new Error(responseData.message || 'GAS request failed')
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
