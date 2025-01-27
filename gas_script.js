// Configuration
const BRANCH_SHEET_ID = "AAA"
const INVOICE_SHEET_ID = "BBB"
const VEHICLE_SHEET_ID = "CCC"
const USER_SHEET_ID = "AAA"
const SESSION_SHEET_ID = "AAA"
const APP_NAME = "Logiss Delivery App | RDA"
const APP_URL = "l" // Ganti dengan URL aplikasi
const API_KEY = 'f7d3h8j2k5l9m4n6f7d3h8j2k5l9m4n6p8q1r3s5t7v9w2x4z6p8q1r3s5t7v9w2x4z6'

// URL Parameter Helpers
function getParam(e, name) {
  return e.parameter[name]
}

function getPostData(e) {
  return JSON.parse(e.postData.contents)
}

// Web app endpoints
function doGet(e) {
  // Validate API Key from URL parameter
  const apiKey = getParam(e, 'key')
  if (apiKey !== API_KEY) {
    return sendError('Invalid API Key')
  }

  const action = getParam(e, 'action')
  console.log('doGet action:', action) // Debug log

  switch (action) {
    case 'getBranchConfig':
      return getBranchConfig()
    case 'getInvoiceList':
      return getInvoiceList(getParam(e, 'branch'), getParam(e, 'date'))
    case 'getVehicleData':
      return getVehicleData(getParam(e, 'branch'))
    case 'activateAccount':
      return activateAccount(getParam(e, 'token'))
    default:
      return sendError('Invalid action')
  }
}

function doPost(e) {
  // Validate API Key from URL parameter
  const apiKey = getParam(e, 'key')
  if (apiKey !== API_KEY) {
    return sendError('Invalid API Key')
  }

  const data = getPostData(e)
  const action = data.action
  console.log('doPost action:', action) // Debug log

  switch (action) {
    case 'submitForm':
      return submitForm(data.data)
    case 'login':
      return handleLogin(data.data)
    case 'register':
      return handleRegistration(data.data)
    default:
      return sendError('Invalid action')
  }
}

// Branch Config
function getBranchConfig() {
  try {
    console.log('Getting branch config...') // Debug log
    const spreadsheet = SpreadsheetApp.openById(BRANCH_SHEET_ID)
    const sheet = spreadsheet.getSheetByName('BRANCH')
    const data = sheet.getDataRange().getValues()
    
    console.log('Raw branch data:', data) // Debug log
    
    const branches = data.slice(1).map(row => ({
      branchId: row[0],
      branchName: row[1],
      region: row[2],
      address: row[3],
      coordinates: {
        lat: row[4],
        long: row[5]
      }
    }))
    
    console.log('Processed branches:', branches) // Debug log
    
    return sendResponse({ 
      success: true,
      data: { branches } 
    })
  } catch (error) {
    console.error('Error in getBranchConfig:', error) // Debug log
    return sendError('Error getting branch config: ' + error.toString())
  }
}

// Invoice List
function getInvoiceList(branch) {
  const spreadsheet = SpreadsheetApp.openById(INVOICE_SHEET_ID)
  const sheet = spreadsheet.getSheetByName('Sales Header')
  const data = sheet.getDataRange().getValues()
  
  const invoices = data
    .filter(row => row[3] === branch)
    .map(row => ({
      branchName: row[3],
      tanggalLengkap: row[12],
      nomorInvoice: row[13],
      namaCustomer: row[10]
    }))
  
  return sendResponse({ 
    success: true,
    data: { invoices } 
  })
}

// Vehicle Data
function getVehicleData(branch) {
  const spreadsheet = SpreadsheetApp.openById(VEHICLE_SHEET_ID)
  const sheet = spreadsheet.getSheetByName('LOGISTIC')
  const data = sheet.getDataRange().getValues()
  
  const vehicles = data
    .filter(row => row[0] === branch)
    .map(row => ({
      licensePlate: row[1],
      vehicleName: row[2],
      vehicleCategory: row[3]
    }))
 
  return sendResponse({ 
    success: true,
    data: { vehicles } 
  })
}

// Form Submission
function submitForm(formData) {
  Logger.log('Form data received:', formData)
  
  return sendResponse({
    success: true,
    message: 'Form submitted successfully!'
  })
}

// Authentication Handlers
function handleLogin(data) {
  const spreadsheet = SpreadsheetApp.openById(USER_SHEET_ID)
  const sheet = spreadsheet.getSheetByName('Users')
  const users = sheet.getDataRange().getValues()
  const headerRow = users.shift()
  
  // Find user by email
  const user = users.find(row => row[0] === data.email)
  if (!user) {
    return sendError('Email atau password salah')
  }
  
  // Check if account is active
  if (!user[3]) { // Assuming column 3 is active status
    return sendError('Akun belum diaktivasi')
  }
  
  // Compare hashed password (already hashed from client)
  if (data.hashedPassword !== user[1]) {
    return sendError('Email atau password salah')
  }
  
  // Update last login
  const userRow = users.indexOf(user) + 2
  sheet.getRange(userRow, 4).setValue(new Date()) // Assuming column 4 is last login
  
  return sendResponse({
    success: true,
    data: {
      email: user[0],
      fullName: user[2],
      role: user[6],
      branch: user[7]
    }
  })
}

function handleRegistration(data) {
  const spreadsheet = SpreadsheetApp.openById(USER_SHEET_ID)
  const sheet = spreadsheet.getSheetByName('USERS')
  const users = sheet.getDataRange().getValues()
  
  // Check if email exists
  if (users.some(row => row[0] === data.email)) {
    return sendError('Email sudah terdaftar')
  }
  
  // Add new user
  sheet.appendRow([
    data.email,
    data.hashedPassword, // Already hashed from client
    data.fullName,
    false, // Active status
    '', // Last login
    data.activationToken, // Generated from client
    data.role,
    data.branch,
    new Date() // Created at
  ])

  // Send activation email
  sendActivationEmail(data.email, data.fullName, data.activationToken)
  
  return sendResponse({
    success: true,
    message: 'Registrasi berhasil. Silakan cek email untuk aktivasi akun.'
  })
}

function activateAccount(token) {
  const spreadsheet = SpreadsheetApp.openById(USER_SHEET_ID)
  const sheet = spreadsheet.getSheetByName('USERS')
  const users = sheet.getDataRange().getValues()
  const headerRow = users.shift()
  
  // Find user by activation token
  const userIndex = users.findIndex(row => row[5] === token)
  if (userIndex === -1) {
    return ContentService
      .createTextOutput('Token aktivasi tidak valid')
      .setMimeType(ContentService.MimeType.TEXT)
  }
  
  // Activate account
  const userRow = userIndex + 2
  sheet.getRange(userRow, 4).setValue(true) // Active status
  sheet.getRange(userRow, 6).setValue('') // Clear activation token
  
  return ContentService
    .createTextOutput('Akun berhasil diaktivasi. Silakan login.')
    .setMimeType(ContentService.MimeType.TEXT)
}

// Email Functions
function sendActivationEmail(email, name, token) {
  const activationLink = `${APP_URL}auth/activate?token=${token}`
  const subject = `Aktivasi Akun ${APP_NAME}`
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e3a8a;">Aktivasi Akun ${APP_NAME}</h2>
      <p>Halo ${name},</p>
      <p>Terima kasih telah mendaftar di ${APP_NAME}. Untuk mengaktifkan akun Anda, silakan klik tombol di bawah ini:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationLink}" 
           style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Aktivasi Akun
        </a>
      </div>
      <p>Atau salin dan tempel link berikut di browser Anda:</p>
      <p style="background-color: #f3f4f6; padding: 10px; word-break: break-all;">
        ${activationLink}
      </p>
      <p>Link aktivasi ini akan kadaluarsa dalam 24 jam.</p>
      <p>Jika Anda tidak merasa mendaftar di ${APP_NAME}, Anda dapat mengabaikan email ini.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #6b7280; font-size: 12px;">
        Email ini dikirim secara otomatis, mohon tidak membalas email ini.
      </p>
    </div>
  `
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    })
    Logger.log(`Activation email sent to ${email}`)
  } catch (error) {
    Logger.log(`Error sending activation email to ${email}: ${error}`)
    // Continue execution even if email fails
    // The user can request resend activation email later
  }
}

// Utility Functions
function sendResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

function sendError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      message: message
    }))
    .setMimeType(ContentService.MimeType.JSON)
}
