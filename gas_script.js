// Configuration
const BRANCH_SHEET_ID = "AAA"
const INVOICE_SHEET_ID = "BBB"
const VEHICLE_SHEET_ID = "CCC"
const USER_SHEET_ID = "AAA"
const SESSION_SHEET_ID = "AAA"
const EXPENSES_SHEET_ID = "DDD"
const DELIVERY_SHEET_ID = "EEE"

const APP_NAME = "Logiss Delivery App | RDA"
const APP_URL = "URL" // Ganti dengan URL aplikasi
const API_KEY = "APIKEY" // Gunakan key yang sama dengan yang di Netlify

const TIMEZONE = "Asia/Jakarta"
// Geofencing Configuration
const GEOFENCE_RADIUS_DEV = 10000  // 10km in meters
const GEOFENCE_RADIUS_PROD = 100    // 100m in meters

// Branch Validation
function validateBranch(branchName) {
  try {
    const sheet = SpreadsheetApp.openById(BRANCH_SHEET_ID).getSheetByName('BRANCH')
    const data = sheet.getDataRange().getValues()
    const headerRow = data.shift()
    
    // Find branch by name
    const branch = data.find(row => row[1] === branchName) // Using branchName (column 1)
    
    if (!branch) {
      return {
        valid: false,
        message: 'Cabang tidak ditemukan'
      }
    }
    
    return {
      valid: true,
      branchData: {
        branchId: branch[0],
        branchName: branch[1],
        coordinates: {
          lat: branch[4],
          long: branch[5]
        }
      }
    }
  } catch (error) {
    console.error('Error validating branch:', error)
    throw error
  }
}

// URL Parameter Helpers
function getParam(e, name) {
  return e.parameter[name]
}

function getPostData(e) {
  return JSON.parse(e.postData.contents)
}

// Date Helper Functions
function toJakartaTime(date) {
  // Format: "2024-01-27 08:19:55"
  return Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd HH:mm:ss")
}

function toUTCString(date) {
  // Extract individual date and time components
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  // Combine into the desired format
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getDateOnly(dateString) {
  // Extract only the date part (YYYY-MM-DD) from a date string
  return dateString.split('T')[0]
}

function isSameDate(date1, date2) {
  return getDateOnly(toUTCString(date1)) === getDateOnly(toUTCString(date2))
}

// Helper function to format date to m/d/yyyy
function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
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
    case 'getRangedInvoiceList':  // Add new action
      return getRangedInvoiceList(getParam(e, 'branch'), getParam(e, 'date'))
    case 'getVehicleData':
      return getVehicleData(getParam(e, 'branch'))
    case 'getSingleVehicleData':
      return getSingleVehicleData(getParam(e, 'branch'), getParam(e, 'plate'))
    case 'getExpenses':
      return getExpenses(getParam(e, 'branch'), getParam(e, 'category'), getParam(e, 'range'));
    case 'getFilteredExpenses':
      return getFilteredExpenses(getParam(e, 'context'), getParam(e, 'range'));
    case 'getDelivery':
      return getDelivery(getParam(e, 'id'))
    case 'getInvoice':
      return getInvoice(getParam(e, 'invoiceNo'))
    case 'getDeliveries':
      return getDeliveries(getParam(e, 'branch'), getParam(e, 'range'));
    case 'getDeliveriesContext':
      return getDeliveriesContext({
        branch: getParam(e, 'branch'),
        context: getParam(e, 'context'),
        range: getParam(e, 'range')
      });
    case 'getAvailableInvoices':
      return getAvailableInvoices({
        branch: getParam(e, 'branch'),
        date: getParam(e, 'date'),
        range: getParam(e, 'range')
      });
    case 'activate':
      return activateAccount(getParam(e, 'token'))
    case 'getActiveSessions':
      return getActiveSessions(getParam(e, 'branch'))
    case 'logout':
      return handleLogout({ email: getParam(e, 'email') })
    default:
      return sendError('Invalid action')
  }
}

function doPost(e) {
  const data = getPostData(e)
  const action = data.action

  switch (action) {
    case 'submitForm':
      return submitForm(data.data)
    case 'login':
      return handleLogin(data.data)
    case 'register':
      return handleRegistration(data.data)
    case 'submitCheckIn':
      return handleCheckIn(data.data)
    case 'submitCheckOut':
      return handleCheckOut(data.data)
    case 'submitExpenses':
      return submitExpenses(data.data)
    case 'submitDelivery':
      return submitDelivery(data.data)
    case 'logout':
      return handleLogout(data.data)
    case 'forgotPassword':
      return handleForgotPassword(data.data)
    case 'resetPassword':
      return handleResetPassword(data.data)
    default:
      return sendError('Invalid action')
  }
}

// Geofencing Helper Functions
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // Distance in meters
}

function isWithinGeofence(userLat, userLon, branchLat, branchLon, isDev = true) {
  const maxDistance = isDev ? GEOFENCE_RADIUS_DEV : GEOFENCE_RADIUS_PROD
  const distance = calculateDistance(userLat, userLon, branchLat, branchLon)
  
  return {
    isWithin: distance <= maxDistance,
    distance: distance,
    maxAllowedDistance: maxDistance
  }
}

// Session Management Functions
function generateSessionId() {
  return Utilities.getUuid()
}

function getActiveSessions(branch) {
  const sheet = SpreadsheetApp.openById(SESSION_SHEET_ID).getSheetByName('SESSIONS')
  const data = sheet.getDataRange().getValues()
  const headers = data.shift()
  
  const activeSessions = data
    .filter(row => row[3] === branch && row[11] === 'Active')
    .map(row => ({
      sessionId: row[0],
      timestamp: row[1],
      username: row[2],
      branch: row[3],
      vehicleNumber: row[4],
      checkInTime: row[5],
      initialOdometer: row[7],
      checkInPhotoUrl: row[9]
    }))
  
  return sendResponse({ activeSessions })
}

function isVehicleAvailable(vehicleNumber) {
  try {
    const sheet = SpreadsheetApp.openById(SESSION_SHEET_ID).getSheetByName('SESSIONS')
    const data = sheet.getDataRange().getValues()
    const headers = data.shift() // Remove header row
    
    // Get today's date at midnight for comparison
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Check for active sessions today for this vehicle
    const activeSession = data.find(row => {
      if (row[4] !== vehicleNumber) return false // Different vehicle
      if (row[11] !== 'Active') return false // Not active
      
      // Compare dates only (ignore time)
      const sessionDate = new Date(row[5])
      sessionDate.setHours(0, 0, 0, 0)
      return sessionDate.getTime() === today.getTime()
    })
    
    if (activeSession) {
      Logger.log(`Vehicle ${vehicleNumber} has active session today`)
      return false
    }
    
    Logger.log(`Vehicle ${vehicleNumber} is available`)
    return true
  } catch (error) {
    Logger.log(`Error checking vehicle availability: ${error}`)
    throw error
  }
}

function handleCheckIn(data) {
  try {
    // Validasi data yang diterima
    if (!data.branch || !data.vehicleNumber || !data.checkInTime || !data.initialOdometer || !data.checkInPhoto || !data.location) {
      return sendError('Data yang diperlukan tidak lengkap');
    }

    // Generate sessionId jika belum ada
    const sessionId = data.sessionId || Utilities.getUuid();

    try {
      // Process check-in
      const spreadsheet = SpreadsheetApp.openById(SESSION_SHEET_ID);
      const sheet = spreadsheet.getSheetByName('SESSIONS');

      // Cek apakah kendaraan sedang aktif
      const activeVehicle = sheet.getDataRange().getValues().find(row => 
        row[3] === data.vehicleNumber && // vehicleNumber
        row[8] === 'Active' // status
      );

      if (activeVehicle) {
        return sendError('Kendaraan sedang dalam perjalanan');
      }

      // Get branch coordinates for geofencing
      const branchSheet = SpreadsheetApp.openById(BRANCH_SHEET_ID).getSheetByName('BRANCH')
      const branchData = branchSheet.getDataRange().getValues()
      const branch = branchData.find(row => row[1] === data.branch) // Branch

      if (!branch) {
        return sendError('Data cabang tidak ditemukan')
      }
       
      // Validate geofencing
      const geoCheck = isWithinGeofence(
        data.location.latitude,
        data.location.longitude,
        branch[4], // latitude
        branch[5], // longitude
        true // isDev
      )

      if (!geoCheck.isWithin) {
        return sendError('Lokasi terlalu jauh dari cabang', {
          distance: geoCheck.distance,
          maxAllowedDistance: geoCheck.maxAllowedDistance
        })
      }

      // Upload odometer photo
      const uploadResult = uploadFile(data.checkInPhoto, 'odometerCheckin', `checkin_${sessionId}`);
      if (!uploadResult.success) {
        return sendError(uploadResult.message);
      }
      // Tambahkan data check-in
      sheet.appendRow([ 
        sessionId,
        data.checkInTime,
        data.username,
        data.branch,
        data.vehicleNumber,
        data.checkInTime,
        '',
        data.initialOdometer,
        '',
        uploadResult.url,
        '',
        JSON.stringify(data.location),
        '',
        'Active'
      ]);

      return sendResponse({
        success: true,
        message: 'Check-in berhasil',
        data: {
          sessionId: sessionId,
          checkInPhotoUrl: uploadResult.url
        }
      });

    } catch (sheetError) {
      // Jika gagal menyimpan ke sheet, hapus file yang sudah diupload
      try {
        const fileId = uploadResult.url.match(/[-\w]{25,}/);
        if (fileId) {
          DriveApp.getFileById(fileId[0]).setTrashed(true);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      
      throw sheetError;
    }

  } catch (error) {
    console.error('Error in submitCheckIn:', error);
    return sendError(`Terjadi kesalahan saat check-in: ${error.toString()}`);
  }
}

function handleCheckOut(data) {
  try {
    // Validate required fields
    if (!data.sessionId || !data.checkOutTime || !data.finalOdometer || 
        !data.checkOutPhoto || !data.location || !data.username) {
      return sendError('Data tidak lengkap')
    }

    // Get session data
    const sheet = SpreadsheetApp.openById(SESSION_SHEET_ID).getSheetByName('SESSIONS')
    const sessions = sheet.getDataRange().getValues()
    const headers = sessions.shift()
    
    // Find session by sessionId and username
    const sessionIndex = sessions.findIndex(row => 
      row[0] === data.sessionId && // Session ID
      row[2] === data.username && // Username
      row[13] === 'Active' // Status
    )

    if (sessionIndex === -1) {
      return sendError('Session tidak ditemukan atau sudah selesai')
    }
    
    const session = sessions[sessionIndex]
    const initialOdometer = session[7] // Initial Odometer

    // Validate odometer
    if (data.finalOdometer <= initialOdometer) {
      return sendError('Odometer akhir harus lebih besar dari odometer awal')
    }

    // Get branch coordinates for geofencing
    const branchSheet = SpreadsheetApp.openById(BRANCH_SHEET_ID).getSheetByName('BRANCH')
    const branchData = branchSheet.getDataRange().getValues()
    const branch = branchData.find(row => row[1] === session[3]) // Branch

    if (!branch) {
      return sendError('Data cabang tidak ditemukan')
    }
       
    // Validate geofencing
    const geoCheck = isWithinGeofence(
      data.location.latitude,
      data.location.longitude,
      branch[4], // latitude
      branch[5], // longitude
      true // isDev
    )

    if (!geoCheck.isWithin) {
      return sendError('Lokasi terlalu jauh dari cabang', {
        distance: geoCheck.distance,
        maxAllowedDistance: geoCheck.maxAllowedDistance
      })
    }

    // Upload odometer photo
    const uploadResult = uploadFile(data.checkOutPhoto, 'odometerCheckout', `checkout_${data.sessionId}`)
    if (!uploadResult.success) {
      return sendError(uploadResult.message)
    }

    try {
      // Calculate distance traveled
      const distanceTraveled = data.finalOdometer - initialOdometer

      // Update session
      const rowIndex = sessionIndex + 2 // +2 because of 0-based index and header row
      const updates = [
        [6, toUTCString(new Date(data.checkOutTime))], // Check Out Time
        [8, data.finalOdometer], // Final Odometer
        [10, uploadResult.url], // Check Out Photo URL
        [12, JSON.stringify(data.location)], // Check Out Location
        [13, 'Completed'], // Status
        [14, distanceTraveled] // Distance Travelled
      ]

      // Apply all updates
      updates.forEach(([col, value]) => {
        sheet.getRange(rowIndex, col + 1).setValue(value)
      })

      return sendResponse({
        success: true,
        message: 'Check-out berhasil',
        data: {
          sessionId: data.sessionId,
          checkOutPhotoUrl: uploadResult.url,
          distanceTraveled: distanceTraveled
        }
      })

    } catch (sheetError) {
      // If failed to update sheet, cleanup uploaded file
      try {
        const fileId = uploadResult.url.match(/[-\w]{25,}/)
        if (fileId) {
          DriveApp.getFileById(fileId[0]).setTrashed(true)
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError)
      }
      
      throw sheetError
    }

  } catch (error) {
    console.error('Check-out error:', error)
    return sendError('Terjadi kesalahan saat check-out: ' + error.toString())
  }
}

// Branch Config
function getBranchConfig() {
  const spreadsheet = SpreadsheetApp.openById(BRANCH_SHEET_ID)
  const sheet = spreadsheet.getSheetByName('BRANCH')
  const data = sheet.getDataRange().getValues()
  
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
  
  return sendResponse({ branches })
}

// Single Invoice
// Get single invoice by invoice number
function getInvoice(invoiceNo) {
  try {
    Logger.log(`Getting invoice data for invoice number: ${invoiceNo}`)

    if (!invoiceNo) {
      Logger.log('Missing required parameter: invoiceNo')
      return sendError('Parameter invoice number diperlukan')
    }

    const spreadsheet = SpreadsheetApp.openById(INVOICE_SHEET_ID)
    const sheet = spreadsheet.getSheetByName('Sales Header')
    const data = sheet.getDataRange().getValues()
    const headers = data.shift()

    // Find invoice by invoice number (column 13)
    const invoice = data.find(row => row[13] === invoiceNo)
    
    if (!invoice) {
      Logger.log('Invoice not found')
      return sendError('Invoice tidak ditemukan')
    }

    // Map invoice data to response format
    const response = {
      nomorInvoice: invoice[13],
      tanggal: `${invoice[1]}/${invoice[2]}/${invoice[0]}`, // month/day/year
      branchName: invoice[3],
      prinsipal: invoice[5],
      namaCustomer: invoice[10],
      // Add more fields as needed
      totalAmount: invoice[11],
      status: invoice[12],
      createdBy: invoice[14],
      lastModified: invoice[15]
    }

    Logger.log('Invoice found:', response)

    return sendResponse({
      success: true,
      data: response
    })

  } catch (error) {
    Logger.log(`Error in getInvoice: ${error}`)
    return sendError('Gagal mengambil data invoice: ' + error.toString())
  }
}

// Invoice List
function getInvoiceList(branch, date) {
  try {
    // Start execution time logging
    const startTime = new Date().getTime();
    Logger.log(`Starting getInvoiceList for branch: ${branch}, date: ${date}`);

    // Validate required parameters
    if (!branch || !date) {
      Logger.log('Missing required parameters');
      return sendError('Parameter branch dan date diperlukan');
    }

    // Validate date format (m/d/yyyy)
    const dateParts = date.split('/');
    if (dateParts.length !== 3) {
      Logger.log('Invalid date format');
      return sendError('Format tanggal tidak valid. Gunakan format m/d/yyyy');
    }

    const month = dateParts[0];
    const day = dateParts[1];
    const year = dateParts[2];

    // Get spreadsheet and data
    const spreadsheet = SpreadsheetApp.openById(INVOICE_SHEET_ID);
    const sheet = spreadsheet.getSheetByName('Sales Header');
    
    // Get only needed columns
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 14); // Get columns 0-13
    const data = dataRange.getValues();

    Logger.log(`Processing ${data.length} rows`);

    // Process data
    const invoices = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Early exit if not matching branch
      if (row[3] !== branch) continue;
      
      // Convert to string for comparison
      const rowYear = String(row[0]);
      const rowMonth = String(row[1]);
      const rowDay = String(row[2]);
      
      if (rowYear === year && rowMonth === month && rowDay === day) {
        invoices.push({
          branchName: row[3],
          tanggalLengkap: `${month}/${day}/${year}`,
          nomorInvoice: row[13],
          namaCustomer: row[10],
          prinsipal: row[5]
        });
      }
    }

    Logger.log(`Found ${invoices.length} matching invoices`);

    // Prepare response
    const response = {
      success: true,
      data: {
        invoices: invoices,
        total: invoices.length,
        branch: branch,
        date: date
      }
    };

    // Log execution time
    const endTime = new Date().getTime();
    Logger.log(`getInvoiceList completed in ${endTime - startTime}ms`);

    // Clear any remaining operations and force completion
    SpreadsheetApp.flush();
    
    // Return response immediately
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error in getInvoiceList: ${error}`);
    
    // Force completion even on error
    SpreadsheetApp.flush();
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: `Gagal mengambil data invoice: ${error.toString()}`
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper Functions untuk Date Range
function getDateRange(endDate) {
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return {
    start: start,
    end: end
  };
}

function formatDateMDY(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function isDateInRange(testDate, startDate, endDate) {
  const test = new Date(testDate);
  test.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  return test >= start && test <= end;
}

// Fungsi baru untuk mendapatkan invoice dengan range 7 hari
function getRangedInvoiceList(branch, date) {
  try {
    // Start execution time logging
    const startTime = new Date().getTime();
    Logger.log(`Starting getRangedInvoiceList for branch: ${branch}, end date: ${date}`);

    // Validate required parameters
    if (!branch || !date) {
      Logger.log('Missing required parameters');
      return sendError('Parameter branch dan date diperlukan');
    }

    // Validate date format (m/d/yyyy)
    const dateParts = date.split('/');
    if (dateParts.length !== 3) {
      Logger.log('Invalid date format');
      return sendError('Format tanggal tidak valid. Gunakan format m/d/yyyy');
    }

    // Get date range
    const endDate = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
    const dateRange = getDateRange(endDate);
    
    Logger.log(`Fetching invoices from ${formatDateMDY(dateRange.start)} to ${formatDateMDY(dateRange.end)}`);

    // Get spreadsheet and data
    const spreadsheet = SpreadsheetApp.openById(INVOICE_SHEET_ID);
    const sheet = spreadsheet.getSheetByName('Sales Header');
    
    // Get only needed columns
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 14); // Get columns 0-13
    const data = dataRange.getValues();

    Logger.log(`Processing ${data.length} rows`);

    // Process data
    const invoices = [];
    let processedRows = 0;
    let matchingBranch = 0;
    let inDateRange = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      processedRows++;
      
      // Early exit if not matching branch
      if (row[3] !== branch) continue;
      matchingBranch++;
      
      // Create date from row data
      const rowDate = new Date(row[0], row[1] - 1, row[2]); // year, month (0-based), day
      
      // Check if date is in range
      if (isDateInRange(rowDate, dateRange.start, dateRange.end)) {
        inDateRange++;
        invoices.push({
          branchName: row[3],
          tanggalLengkap: formatDateMDY(rowDate),
          nomorInvoice: row[13],
          namaCustomer: row[10],
          prinsipal: row[5]
        });
      }

      // Log progress every 10000 rows
      if (processedRows % 10000 === 0) {
        Logger.log(`Processed ${processedRows} rows, found ${matchingBranch} matching branch, ${inDateRange} in date range`);
      }
    }

    // Sort invoices by date (newest first)
    invoices.sort((a, b) => {
      const dateA = new Date(a.tanggalLengkap);
      const dateB = new Date(b.tanggalLengkap);
      return dateB - dateA;
    });

    Logger.log(`Final results: ${invoices.length} invoices found`);
    Logger.log(`Total rows processed: ${processedRows}`);
    Logger.log(`Matching branch: ${matchingBranch}`);
    Logger.log(`In date range: ${inDateRange}`);

    // Prepare response with metadata
    const response = {
      success: true,
      data: {
        invoices: invoices,
        total: invoices.length,
        branch: branch,
        dateRange: {
          start: formatDateMDY(dateRange.start),
          end: formatDateMDY(dateRange.end)
        },
        metadata: {
          processedRows: processedRows,
          matchingBranch: matchingBranch,
          inDateRange: inDateRange,
          executionTime: new Date().getTime() - startTime
        }
      }
    };

    // Log execution time
    const endTime = new Date().getTime();
    Logger.log(`getRangedInvoiceList completed in ${endTime - startTime}ms`);

    // Clear any remaining operations and force completion
    SpreadsheetApp.flush();
    
    // Return response immediately
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error in getRangedInvoiceList: ${error}`);
    
    // Force completion even on error
    SpreadsheetApp.flush();
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: `Gagal mengambil data invoice: ${error.toString()}`
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
  }

  function getExpenses(branch, category = null, range = null) {
  try {
    // Start execution time logging
    const startTime = new Date().getTime();
    Logger.log(`Starting getExpenses for branch: ${branch}, category: ${category}, range: ${range}`);

    // Validate required parameters
    if (!branch) {
      Logger.log('Missing required parameter: branch');
      return sendError('Parameter branch diperlukan');
    }

    // Parse range if provided
    let startDate, endDate;
    const today = new Date();

    if (range) {
      const rangeParts = range.split(',');
      if (rangeParts.length !== 2) {
        Logger.log('Invalid range format');
        return sendError('Format range tidak valid. Gunakan format: startDate,endDate');
      }
      startDate = new Date(rangeParts[0]);
      endDate = new Date(rangeParts[1]);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // End of today
    }

    const spreadsheet = SpreadsheetApp.openById(EXPENSES_SHEET_ID);
    const sheet = spreadsheet.getSheetByName('EXPENSES');
    
    // Get only needed columns
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 14); // Get columns 0-13
    const data = dataRange.getValues();

    Logger.log(`Processing ${data.length} rows`);

    // Process data
    const expenses = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const expenseDate = new Date(row[0]); // Tanggal dari kolom pertama

      // Early exit if not matching branch
      if (row[3] !== branch) continue;

      // Check if the date is in range
      if (isDateInRange(expenseDate, startDate, endDate)) {
        if (category && row[5] !== category) continue; // Filter by category if provided

        expenses.push({
          date: formatDateMDY(expenseDate), // Format tanggal ke m/d/yyyy
          username: row[1],
          sessionId: row[2],
          branch: row[3],
          licensePlate: row[4],
          category: row[5],
          subcategory: row[6],
          amount: row[7],
          description: row[8],
          receiptPhotoUrl: row[9],
          status: row[10],
          approvedBy: row[11],
          approvedAt: row[12]
        });
      }
    }

    Logger.log(`Found ${expenses.length} matching expenses`);

    // Prepare response
    const response = {
      success: true,
      data: {
        expenses: expenses,
        total: expenses.length,
        branch: branch,
        category: category,
        range: range
      }
    };

    // Log execution time
    const endTime = new Date().getTime();
    Logger.log(`getExpenses completed in ${endTime - startTime}ms`);

    return sendResponse(response);

    } catch (error) {
      Logger.log(`Error in getExpenses: ${error}`);
      return sendError(`Gagal mengambil data pengeluaran: ${error.toString()}`);
    }
  }
  
  function getFilteredExpenses(context, range = null) {
  try {
    // Start execution time logging
    const startTime = new Date().getTime();
    Logger.log(`Starting getFilteredExpenses for context: ${context}, range: ${range}`);

    // Validate required parameters
    if (!context) {
      Logger.log('Missing required parameter: context');
      return sendError('Parameter context diperlukan');
    }

    // Parse range if provided
    let startDate, endDate;
    const today = new Date();

    if (range) {
      const rangeParts = range.split(',');
      if (rangeParts.length !== 2) {
        Logger.log('Invalid range format');
        return sendError('Format range tidak valid. Gunakan format: startDate,endDate');
      }
      startDate = new Date(rangeParts[0]);
      endDate = new Date(rangeParts[1]);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // End of today
    }

    const spreadsheet = SpreadsheetApp.openById(EXPENSES_SHEET_ID);
    const sheet = spreadsheet.getSheetByName('EXPENSES');
    
    // Get only needed columns
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 14); // Get columns 0-13
    const data = dataRange.getValues();

    Logger.log(`Processing ${data.length} rows`);

    // Process data
    const expenses = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const expenseDate = new Date(row[0]); // Tanggal dari kolom pertama

      // Early exit if not matching context
      if (row[4] !== context) continue;

      // Check if the date is in range
      if (isDateInRange(expenseDate, startDate, endDate)) {
        expenses.push({
          date: formatDateMDY(expenseDate), // Format tanggal ke m/d/yyyy
          username: row[1],
          sessionId: row[2],
          branch: row[3],
          licensePlate: row[4],
          category: row[5],
          subcategory: row[6],
          amount: row[7],
          description: row[8],
          receiptPhotoUrl: row[9],
          status: row[10],
          approvedBy: row[11],
          approvedAt: row[12]
        });
      }
    }

    Logger.log(`Found ${expenses.length} matching expenses for context: ${context}`);

    // Prepare response
    const response = {
      success: true,
      data: {
        expenses: expenses,
        total: expenses.length,
        context: context,
        range: range
      }
    };

    // Log execution time
    const endTime = new Date().getTime();
    Logger.log(`getFilteredExpenses completed in ${endTime - startTime}ms`);

    return sendResponse(response);

    } catch (error) {
      Logger.log(`Error in getFilteredExpenses: ${error}`);
      return sendError(`Gagal mengambil data pengeluaran untuk konteks: ${error.toString()}`);
    }
  }

  // Vehicle Data
  function getVehicleData(branch) {
    try {
      Logger.log('Getting vehicle data for branch:', branch)
      
      if (!branch) {
        return sendError('Branch parameter diperlukan')
      }

      const spreadsheet = SpreadsheetApp.openById(VEHICLE_SHEET_ID)
      const sheet = spreadsheet.getSheetByName('LOGISTIC')
      const data = sheet.getDataRange().getValues()
      const headers = data.shift() // Remove header row
      
      Logger.log('Total rows:', data.length)
      
      const vehicles = data
        .filter(row => {
          Logger.log('Comparing branch:', row[0], 'with', branch)
          return row[0] === branch
        })
        .map(row => ({
          licensePlate: row[1],
          vehicleName: row[2],
          vehicleCategory: row[3]
        }))
      
      Logger.log('Found vehicles:', vehicles.length)
      
      return sendResponse({
        success: true,
        data: { vehicles }
      })
    } catch (error) {
      Logger.log('Error in getVehicleData:', error)
      return sendError('Gagal mengambil data kendaraan: ' + error.toString())
    }
  }
  
  function getSingleVehicleData(branch, plate) {
    // Validasi parameter
    if (!branch || !plate) {
      return sendError('Parameter branch dan plate diperlukan');
    }

    const spreadsheet = SpreadsheetApp.openById(VEHICLE_SHEET_ID);
    const sheet = spreadsheet.getSheetByName('LOGISTIC');
    const data = sheet.getDataRange().getValues();

    // Mencari kendaraan berdasarkan branch dan license plate
    const vehicle = data.find(row => row[0] === branch && row[1] === plate);

    if (!vehicle) {
      return sendError('Kendaraan tidak ditemukan');
    }

    // Mengembalikan data kendaraan
    const response = {
      branch: vehicle[0], // Kolom BRANCH
      licensePlate: vehicle[1], // Kolom NOPOL
      vehicleType: vehicle[2], // Kolom TIPE LOGISTIK
      type: vehicle[3] // Kolom TYPE
    };

    return sendResponse(response);
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
    sheet.getRange(userRow, 5).setValue(toJakartaTime(new Date())) // Assuming column 5 is last login
    
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
  
  function handleLogout(data) {
  try {
    if (!data.email) {
      return sendError('Email diperlukan')
    }

    // Check if user has active check-in session
    const sessionSheet = SpreadsheetApp.openById(SESSION_SHEET_ID).getSheetByName('SESSIONS')
    const sessions = sessionSheet.getDataRange().getValues()
    const activeSession = sessions.find(row => 
      row[2] === data.email && // username/email
      row[13] === 'Active' // status
    )

    if (activeSession) {
      return sendError('Tidak dapat logout. Anda masih memiliki sesi check-in yang aktif.')
    }

    // Update last login time
    const userSheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName('Users')
    const users = userSheet.getDataRange().getValues()
    const userIndex = users.findIndex(row => row[0] === data.email)
    
    if (userIndex === -1) {
      return sendError('User tidak ditemukan')
    }

    // Update last login time (column 5)
    const userRow = userIndex + 1
    userSheet.getRange(userRow, 5).setValue(toJakartaTime(new Date()))

    return sendResponse({
      success: true,
      message: 'Logout berhasil'
    })

  } catch (error) {
    console.error('Logout error:', error)
    return sendError('Terjadi kesalahan saat logout: ' + error.toString())
  }
}

function handleForgotPassword(data) {
  try {
    if (!data.email) {
      return sendError('Email diperlukan')
    }

    const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName('Users')
    const users = sheet.getDataRange().getValues()
    const headerRow = users.shift()

    // Find user by email
    const userIndex = users.findIndex(row => row[0] === data.email)
    if (userIndex === -1) {
      return sendError('Email tidak terdaftar')
    }

    const user = users[userIndex]
    const resetToken = Utilities.getUuid()
    const tokenExpiry = new Date()
    tokenExpiry.setHours(tokenExpiry.getHours() + 1) // Token valid for 1 hour

    // Update reset token and expiry (assuming columns 10 and 11 are for reset token and expiry)
    const userRow = userIndex + 2
    sheet.getRange(userRow, 10).setValue(resetToken)
    sheet.getRange(userRow, 11).setValue(tokenExpiry)

    // Send reset password email
    sendResetPasswordEmail(data.email, user[2], resetToken) // user[2] is fullName

    return sendResponse({
      success: true,
      message: 'Email reset password telah dikirim'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return sendError('Terjadi kesalahan saat memproses permintaan reset password: ' + error.toString())
  }
}

function handleResetPassword(data) {
  try {
    if (!data.token || !data.newPassword) {
      return sendError('Token dan password baru diperlukan')
    }

    const sheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName('Users')
    const users = sheet.getDataRange().getValues()
    const headerRow = users.shift()

    // Find user by reset token
    const userIndex = users.findIndex(row => row[9] === data.token) // Assuming column 10 is reset token
    if (userIndex === -1) {
      return sendError('Token tidak valid')
    }

    const user = users[userIndex]
    const tokenExpiry = new Date(user[10]) // Assuming column 11 is token expiry
    const now = new Date()

    if (now > tokenExpiry) {
      return sendError('Token sudah kadaluarsa')
    }

    // Update password and clear reset token
    const userRow = userIndex + 2
    sheet.getRange(userRow, 2).setValue(data.newPassword) // Update password
    sheet.getRange(userRow, 10).setValue('') // Clear reset token
    sheet.getRange(userRow, 11).setValue('') // Clear token expiry

    return sendResponse({
      success: true,
      message: 'Password berhasil diubah'
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return sendError('Terjadi kesalahan saat reset password: ' + error.toString())
  }
}

function sendResetPasswordEmail(email, name, token) {
  const resetLink = `${APP_URL}auth/reset-password?token=${token}`
  const subject = `Reset Password ${APP_NAME}`
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e3a8a;">Reset Password ${APP_NAME}</h2>
      <p>Halo ${name},</p>
      <p>Kami menerima permintaan untuk reset password akun Anda. Untuk melanjutkan, silakan klik tombol di bawah ini:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Atau salin dan tempel link berikut di browser Anda:</p>
      <p style="background-color: #f3f4f6; padding: 10px; word-break: break-all;">
        ${resetLink}
      </p>
      <p>Link reset password ini akan kadaluarsa dalam 1 jam.</p>
      <p>Jika Anda tidak meminta reset password, Anda dapat mengabaikan email ini.</p>
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
    Logger.log(`Reset password email sent to ${email}`)
  } catch (error) {
    Logger.log(`Error sending reset password email to ${email}: ${error}`)
    throw error
  }
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
    
    return sendResponse({
      success: true,
      message: 'Akun berhasil diaktivasi. Silakan login.'
    })
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

function uploadFile(fileContent, fileType, name) {
  const folderMap = {
    'odometerCheckin': '1-eTXPfeiMkfMUKftB-eoV_l8Akx9voi3',
    'odometerCheckout': '1T5ES6uwzCHLTIA35Mm-ktuY49NzO1Mxi',
    'receiptPhoto': '1F-dq0qljiYayC-ymCqdwqBgfZwUkXE8u',
    'deliveryCheckinPhoto': '1OSASwKwLccOwSBTr3eCYUUGr-kj2DK1Z',
    'deliveryPhoto': '1y7U-325ZchEumlugdb0sb0_qaW1-FIQ8',
    'paymentPhoto': '1cRhyqckP8N47rXpWPeOR_6_DBE2hSb7p',
    'profilePhoto': '18A1j0oSM8rFvjW5IrnVICVYChNVzJUHJ'
  };

  try {
    const folderId = folderMap[fileType];
    if (!folderId) {
      return { success: false, message: 'Invalid file type' };
    }

    // Convert base64 to blob
    const decodedContent = Utilities.base64Decode(fileContent);
    const blob = Utilities.newBlob(decodedContent, 'image/jpeg', `${name}.jpg`);
    
    // Save to Drive
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);
    
    // Make file publicly accessible
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      url: file.getUrl()
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

function submitExpenses(data) {
  try {
    // Validasi data yang diterima
    if (!data.date || !data.username || !data.branch || !data.category || !data.subcategory || !data.amount || !data.licensePlate) {
      return sendError('Data yang diperlukan tidak lengkap');
    }

    // Upload receipt photo if provided
    let receiptPhotoUrl = '';
    if (data.receiptPhoto) {
      const uploadResult = uploadFile(data.receiptPhoto, 'receiptPhoto', `receipt_${data.sessionId}`);
      if (!uploadResult.success) {
        return sendError(uploadResult.message);
      }
      receiptPhotoUrl = uploadResult.url;
    }

    const spreadsheet = SpreadsheetApp.openById(EXPENSES_SHEET_ID);
    const sheet = spreadsheet.getSheetByName('EXPENSES');

    // Menambahkan data ke sheet
    sheet.appendRow([
      data.date,
      data.username,
      data.sessionId,
      data.branch,
      data.licensePlate,
      data.category,
      data.subcategory,
      data.amount,
      data.description,
      receiptPhotoUrl,
      data.status || 'Pending',
      data.approvedBy || null,
      data.approvedAt || null
    ]);

    return sendResponse({ 
      success: true, 
      message: 'Data pengeluaran berhasil ditambahkan.',
      data: {
        receiptPhotoUrl: receiptPhotoUrl
      }
    });

    } catch (error) {
    console.error('Error in submitExpenses:', error);
    return sendError(`Gagal menambahkan data pengeluaran: ${error.toString()}`);
  }
}

// Constants
const PAYMENT_TYPES = {
  TUNAI: 'TUNAI',
  TRANSFER: 'TRANSFER',
  CEK_GIRO: 'CEK/GIRO',
  TTF: 'TANDA TERIMA FAKTUR'
};

// Column indices for better readability and maintenance
const DeliveryCol = {
  TIMESTAMP: 0,
  BRANCH: 1,
  DRIVER: 2,
  HELPER: 3,
  VEHICLE: 4,
  DELIVERY_TIME: 5,
  STORE_NAME: 6,
  STORE_ADDRESS: 7,
  INVOICE_NUMBER: 8,
  INVOICE_AMOUNT: 9,
  PAYMENT_TYPE: 10,
  STATUS: 11,
  CHECKIN_PHOTO: 12,
  LATITUDE: 13,
  LONGITUDE: 14,
  LOCATION: 15,
  ID: 16,
  DELIVERY_PHOTO: 17,
  PAYMENT_PHOTO: 18,
  INPUTER: 19
}

// Helper function to get the last delivery ID for a branch on a specific date with caching
const sequenceCache = {};
function getLastDeliveryId(branch, date) {
  try {
    const formattedDate = Utilities.formatDate(date, TIMEZONE, "yyMMdd")
    const cacheKey = `${branch}_${formattedDate}`
    
    // Check cache first
    if (sequenceCache[cacheKey]) {
      sequenceCache[cacheKey]++; // Increment sequence
      return sequenceCache[cacheKey];
    }

    const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('Form Responses 1')
    const lastRow = sheet.getLastRow()
    
    // Only get the last 100 rows or all rows if less than 100
    const numRows = Math.min(100, lastRow - 1)
    const startRow = Math.max(2, lastRow - numRows + 1)
    const data = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues()
    
    // Filter and find max sequence for today's deliveries
    const todayDeliveries = data.filter(row => {
      const deliveryDate = new Date(row[DeliveryCol.TIMESTAMP])
      const deliveryFormattedDate = Utilities.formatDate(deliveryDate, TIMEZONE, "yyMMdd")
      return row[DeliveryCol.BRANCH] === branch && deliveryFormattedDate === formattedDate
    })
    
    let maxSequence = 0
    if (todayDeliveries.length > 0) {
      const sequences = todayDeliveries.map(row => {
        const id = row[DeliveryCol.ID]
        const parts = id.split('.')
        return parseInt(parts[parts.length - 1], 10)
      })
      maxSequence = Math.max(...sequences)
    }
    
    // Cache the result
    sequenceCache[cacheKey] = maxSequence + 1
    
    return maxSequence
  } catch (error) {
    console.error('Error getting last delivery ID:', error)
    return 0
  }
}

// Helper function to generate delivery ID
function generateDeliveryId(branch, date) {
  const formattedDate = Utilities.formatDate(date, TIMEZONE, "yyMMdd")
  const lastSequence = getLastDeliveryId(branch, date)
  const newSequence = (lastSequence + 1).toString().padStart(3, '0')
  return `${branch}.${formattedDate}.${newSequence}`
}

// Helper function to generate Google Maps URL
function generateMapsUrl(latitude, longitude) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

// Helper function to format date string as M/D/YYYY HH:mm:ss without timezone conversion
function formatDateWithTime(dateString) {
  // Parse the date parts from the ISO string
  const [datePart, timePart] = dateString.split('T');
  const [year, month, day] = datePart.split('-');
  const [hours, minutes, secondsWithZ] = timePart.split(':');
  const seconds = secondsWithZ.replace('Z', '');
  
  // Format as M/D/YYYY HH:mm:ss
  return `${parseInt(month)}/${parseInt(day)}/${year} ${hours}:${minutes}:${seconds}`;
}

// Helper function to get driver's full name from session with caching
const userCache = {};
function getDriverFullName(username) {
  try {
    // Check cache first
    if (userCache[username]) {
      return userCache[username];
    }

    // Get user data directly from Users sheet
    const userSheet = SpreadsheetApp.openById(USER_SHEET_ID).getSheetByName('Users')
    const users = userSheet.getDataRange().getValues()
    const userHeaders = users.shift()
    
    const user = users.find(row => row[0] === username)
    const fullName = user ? user[2] : username;
    
    // Cache the result
    userCache[username] = fullName;
    
    return fullName;
  } catch (error) {
    console.error('Error getting driver full name:', error)
    return username
  }
}

// Helper function to map delivery data
function mapDeliveryRow(row) {
  return {
    id: row[DeliveryCol.ID],
    timestamp: row[DeliveryCol.TIMESTAMP],
    branch: row[DeliveryCol.BRANCH],
    driverName: row[DeliveryCol.DRIVER],
    helperName: row[DeliveryCol.HELPER],
    vehicleNumber: row[DeliveryCol.VEHICLE],
    deliveryTime: row[DeliveryCol.DELIVERY_TIME],
    storeName: row[DeliveryCol.STORE_NAME],
    storeAddress: row[DeliveryCol.STORE_ADDRESS],
    invoiceNumber: row[DeliveryCol.INVOICE_NUMBER],
    invoiceAmount: parseFloat(row[DeliveryCol.INVOICE_AMOUNT]),
    paymentType: row[DeliveryCol.PAYMENT_TYPE],
    status: row[DeliveryCol.STATUS],
    checkinPhotoUrl: row[DeliveryCol.CHECKIN_PHOTO],
    location: {
      latitude: row[DeliveryCol.LATITUDE],
      longitude: row[DeliveryCol.LONGITUDE],
      raw: row[DeliveryCol.LOCATION]
    },
    deliveryPhotoUrl: row[DeliveryCol.DELIVERY_PHOTO],
    paymentPhotoUrl: row[DeliveryCol.PAYMENT_PHOTO],
    inputer: row[DeliveryCol.INPUTER]
  }
}

function submitDelivery(data) {
  try {
    // Validate required fields
    if (!data.branch || !data.helperName || !data.vehicleNumber || 
        !data.deliveryTime || !data.storeName || !data.storeAddress ||
        !data.invoiceNumber || !data.invoiceAmount || !data.paymentType ||
        !data.deliveryCheckinPhoto || !data.location || !data.username) {
      return sendError('Data tidak lengkap')
    }

    // Validate payment type
    if (!Object.values(PAYMENT_TYPES).includes(data.paymentType)) {
      return sendError('Metode pembayaran tidak valid. Pilihan yang tersedia: ' + Object.values(PAYMENT_TYPES).join(', '))
    }

    // Generate delivery ID
    const deliveryDate = new Date()
    const jakartaDate = new Date(deliveryDate.getTime() + (7 * 60 * 60 * 1000)) // UTC+7 for Jakarta
    const deliveryId = generateDeliveryId(data.branch, jakartaDate)

    // Upload all photos
    const uploadResults = {
      checkin: uploadFile(data.deliveryCheckinPhoto, 'deliveryCheckinPhoto', `delivery_checkin_${deliveryId}`),
      delivery: data.deliveryPhoto ? uploadFile(data.deliveryPhoto, 'deliveryPhoto', `delivery_photo_${deliveryId}`) : null,
      payment: data.paymentPhoto ? uploadFile(data.paymentPhoto, 'paymentPhoto', `payment_photo_${deliveryId}`) : null
    }

    // Validate uploads
    if (!uploadResults.checkin.success) {
      return sendError(uploadResults.checkin.message)
    }
    if (data.deliveryPhoto && !uploadResults.delivery.success) {
      cleanupUpload(uploadResults.checkin.url)
      return sendError(uploadResults.delivery.message)
    }
    if (data.paymentPhoto && !uploadResults.payment.success) {
      cleanupUpload(uploadResults.checkin.url)
      if (uploadResults.delivery) cleanupUpload(uploadResults.delivery.url)
      return sendError(uploadResults.payment.message)
    }

    try {
      // Add delivery data
      const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('Form Responses 1')
      sheet.appendRow([
        Utilities.formatDate(deliveryDate, TIMEZONE, "yyyy-MM-dd HH:mm:ss"), // Timestamp with timezone
        data.branch,
        getDriverFullName(data.username),
        data.helperName,
        data.vehicleNumber,
        formatDateWithTime(data.deliveryTime), // Use the input time directly
        data.storeName,
        data.storeAddress,
        data.invoiceNumber,
        data.invoiceAmount,
        data.paymentType,
        data.status || 'Pending',
        uploadResults.checkin.url,
        data.location.latitude,
        data.location.longitude,
        generateMapsUrl(data.location.latitude, data.location.longitude),
        deliveryId,
        uploadResults.delivery?.url || '',
        uploadResults.payment?.url || '',
        data.username // Inputer
      ])

      return sendResponse({
        success: true,
        message: 'Data pengiriman berhasil ditambahkan',
        data: {
          deliveryId,
          checkinPhotoUrl: uploadResults.checkin.url,
          deliveryPhotoUrl: uploadResults.delivery?.url || '',
          paymentPhotoUrl: uploadResults.payment?.url || ''
        }
      })

    } catch (sheetError) {
      // Cleanup all uploaded photos
      cleanupUpload(uploadResults.checkin.url)
      if (uploadResults.delivery) cleanupUpload(uploadResults.delivery.url)
      if (uploadResults.payment) cleanupUpload(uploadResults.payment.url)
      throw sheetError
    }

  } catch (error) {
    console.error('Delivery error:', error)
    return sendError('Terjadi kesalahan saat menambahkan data pengiriman: ' + error.toString())
  }
}

function getDelivery(id) {
  try {
    const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('Form Responses 1')
    const data = sheet.getDataRange().getValues()
    const headers = data.shift()
    
    const delivery = data.find(row => row[DeliveryCol.ID] === id)
    if (!delivery) {
      return sendError('Data pengiriman tidak ditemukan')
    }

    return sendResponse({
      success: true,
      data: mapDeliveryRow(delivery)
    })

  } catch (error) {
    console.error('Get delivery error:', error)
    return sendError('Terjadi kesalahan saat mengambil data pengiriman')
  }
}

function getDeliveries(branch, range) {
  try {
    if (!branch) {
      return sendError('Branch parameter required')
    }

    const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('Form Responses 1')
    const values = sheet.getDataRange().getValues()
    const headers = values.shift()

    let deliveries = values
      .filter(row => row[DeliveryCol.BRANCH] === branch)
      .map(row => ({
        id: row[DeliveryCol.ID],
        timestamp: toUTCString(new Date(row[DeliveryCol.TIMESTAMP])) + 'Z',
        branch: row[DeliveryCol.BRANCH],
        driverName: row[DeliveryCol.DRIVER],
        helperName: row[DeliveryCol.HELPER],
        vehicleNumber: row[DeliveryCol.VEHICLE],
        deliveryTime: toUTCString(new Date(row[DeliveryCol.DELIVERY_TIME])) + 'Z',
        storeName: row[DeliveryCol.STORE_NAME],
        storeAddress: row[DeliveryCol.STORE_ADDRESS],
        invoiceNumber: row[DeliveryCol.INVOICE_NUMBER],
        invoiceAmount: parseFloat(row[DeliveryCol.INVOICE_AMOUNT]),
        paymentType: row[DeliveryCol.PAYMENT_TYPE],
        status: row[DeliveryCol.STATUS],
        checkinPhotoUrl: row[DeliveryCol.CHECKIN_PHOTO],
        deliveryPhotoUrl: row[DeliveryCol.DELIVERY_PHOTO] || '',
        paymentPhotoUrl: row[DeliveryCol.PAYMENT_PHOTO] || '',
        location: {
          latitude: parseFloat(row[DeliveryCol.LATITUDE]),
          longitude: parseFloat(row[DeliveryCol.LONGITUDE]),
          raw: JSON.stringify({
            latitude: parseFloat(row[DeliveryCol.LATITUDE]),
            longitude: parseFloat(row[DeliveryCol.LONGITUDE])
          })
        }
      }));

    // Apply date range filter if provided
    if (range) {
      const [startDate, endDate] = range.split(',').map(d => new Date(d))
      deliveries = deliveries.filter(d => {
        const deliveryDate = new Date(d.deliveryTime)
        return deliveryDate >= startDate && deliveryDate <= endDate
      })
    }

    // Force completion
    SpreadsheetApp.flush()

    return sendResponse({
      success: true,
      data: { deliveries }
    })

  } catch (error) {
    console.error('Get deliveries error:', error)
    return sendError('Terjadi kesalahan saat mengambil data pengiriman')
  }
}

function getDeliveriesContext(data) {
  try {
    if (!data.branch || !data.context) {
      return sendError('Branch dan context parameter diperlukan')
    }

    const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('Form Responses 1')
    const values = sheet.getDataRange().getValues()
    const headers = values.shift()

    let deliveries = values
      .filter(row => 
        row[DeliveryCol.BRANCH] === data.branch && 
        row[DeliveryCol.STATUS] === data.context
      )
      .map(row => ({
        id: row[DeliveryCol.ID],
        timestamp: toUTCString(new Date(row[DeliveryCol.TIMESTAMP])) + 'Z',
        branch: row[DeliveryCol.BRANCH],
        driverName: row[DeliveryCol.DRIVER],
        helperName: row[DeliveryCol.HELPER],
        vehicleNumber: row[DeliveryCol.VEHICLE],
        deliveryTime: toUTCString(new Date(row[DeliveryCol.DELIVERY_TIME])) + 'Z',
        storeName: row[DeliveryCol.STORE_NAME],
        storeAddress: row[DeliveryCol.STORE_ADDRESS],
        invoiceNumber: row[DeliveryCol.INVOICE_NUMBER],
        invoiceAmount: parseFloat(row[DeliveryCol.INVOICE_AMOUNT]),
        paymentType: row[DeliveryCol.PAYMENT_TYPE],
        status: row[DeliveryCol.STATUS],
        checkinPhotoUrl: row[DeliveryCol.CHECKIN_PHOTO],
        deliveryPhotoUrl: row[DeliveryCol.DELIVERY_PHOTO] || '',
        paymentPhotoUrl: row[DeliveryCol.PAYMENT_PHOTO] || '',
        location: {
          latitude: parseFloat(row[DeliveryCol.LATITUDE]),
          longitude: parseFloat(row[DeliveryCol.LONGITUDE]),
          raw: JSON.stringify({
            latitude: parseFloat(row[DeliveryCol.LATITUDE]),
            longitude: parseFloat(row[DeliveryCol.LONGITUDE])
          })
        }
      }))

    // Apply date range filter if provided
    if (data.range) {
      const [startDate, endDate] = data.range.split(',').map(d => new Date(d))
      deliveries = deliveries.filter(d => {
        const deliveryDate = new Date(d.deliveryTime)
        return deliveryDate >= startDate && deliveryDate <= endDate
      })
    }

    // Force completion
    SpreadsheetApp.flush()

    return sendResponse({
      success: true,
      data: { deliveries }
    })

  } catch (error) {
    console.error('Get deliveries context error:', error)
    return sendError('Terjadi kesalahan saat mengambil data pengiriman')
  }
}

function getAvailableInvoices(data) {
    const startTime = new Date().getTime();
    Logger.log(`Starting getAvailableInvoices for branch: ${data.branch}, date: ${data.date}`);

    try {
        if (!data.branch || !data.date) {
            Logger.log('Missing required parameters');
            return sendError('Parameter branch dan date diperlukan');
        }

        // Parse date parts
        const dateParts = data.date.split('/');
        if (dateParts.length !== 3) {
            Logger.log('Invalid date format');
            return sendError('Format tanggal tidak valid. Gunakan format m/d/yyyy');
        }

        const month = dateParts[0];
        const day = dateParts[1];
        const year = dateParts[2];

        // Get delivery data - only needed columns (WAKTU PENGIRIMAN, NO FAKTUR, STATUS)
        const deliverySheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('Form Responses 1');
        const deliveryRange = deliverySheet.getRange(2, DeliveryCol.DELIVERY_TIME + 1, deliverySheet.getLastRow() - 1, 3);
        const deliveryData = deliveryRange.getValues();

        // Create map of delivered invoices with their status
        const deliveryMap = new Map();
        for (const row of deliveryData) {
            const deliveryTime = new Date(row[0]); // WAKTU PENGIRIMAN
            const invoiceNumber = row[1];  // NO FAKTUR
            const status = row[2];         // STATUS

            // If range provided, check if delivery is within range
            if (data.range) {
                const [startDate, endDate] = data.range.split(',').map(d => new Date(d));
                if (deliveryTime < startDate || deliveryTime > endDate) continue;
            }

            // Only store if status is not 'MINTA KIRIM ULANG'
            if (status !== 'MINTA KIRIM ULANG') {
                deliveryMap.set(invoiceNumber, true);
            }
        }

        Logger.log(`Processed ${deliveryData.length} delivery records`);

        // Get invoice data - only needed columns
        const invoiceSheet = SpreadsheetApp.openById(INVOICE_SHEET_ID).getSheetByName('Sales Header');
        const invoiceRange = invoiceSheet.getRange(2, 1, invoiceSheet.getLastRow() - 1, 14);
        const invoiceData = invoiceRange.getValues();

        // Process invoices
        const invoices = [];
        for (const row of invoiceData) {
            // Early exit if not matching branch
            if (row[3] !== data.branch) continue;
            
            // Convert to string for comparison
            const rowYear = String(row[0]);
            const rowMonth = String(row[1]);
            const rowDay = String(row[2]);
            
            if (rowYear === year && rowMonth === month && rowDay === day) {
                const invoiceNumber = row[13];
                
                // Only include if not delivered or needs redelivery
                if (!deliveryMap.has(invoiceNumber)) {
                    invoices.push({
                        nomorInvoice: invoiceNumber,
                        branchName: row[3],
                        tanggalLengkap: `${month}/${day}/${year}`,
                        namaCustomer: row[10],
                        prinsipal: row[5]
                    });
                }
            }
        }

        Logger.log(`Found ${invoices.length} available invoices`);
        Logger.log(`Execution time: ${new Date().getTime() - startTime}ms`);

        return sendResponse({
            success: true,
            data: {
                invoices: invoices,
                total: invoices.length,
                branch: data.branch,
                date: data.date
            }
        });

    } catch (error) {
        Logger.log(`Error in getAvailableInvoices: ${error}`);
        return sendError('Terjadi kesalahan saat mengambil data invoice');
    }
}


// Helper functions
function cleanupUpload(url) {
  try {
    const fileId = url.match(/[-\w]{25,}/)
    if (fileId) {
      DriveApp.getFileById(fileId[0]).setTrashed(true)
    }
  } catch (error) {
    console.error('Failed to cleanup file:', error)
  }
}
