const fetch = require('node-fetch')

const GAS_URL = process.env.GAS_URL
const GAS_API_KEY = process.env.GAS_API_KEY

async function fetchGas(action, data = null) {
  try {
    const url = new URL(GAS_URL)
    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': GAS_API_KEY
      }
    }

    if (data) {
      options.body = JSON.stringify({
        action,
        data
      })
    } else {
      url.searchParams.append('action', action)
    }
    
    const response = await fetch(url.toString(), options)
    const responseData = await response.json()
    
    if (!response.ok) {
      throw new Error(responseData.error || `HTTP error! status: ${response.status}`)
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