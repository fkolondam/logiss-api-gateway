// Constants
const DELIVERY_SHEET_ID = 'YOUR_SHEET_ID'
const INVOICE_SHEET_ID = 'YOUR_SHEET_ID'

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
  PAYMENT_PHOTO: 18
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
    paymentPhotoUrl: row[DeliveryCol.PAYMENT_PHOTO]
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

    // Generate ID
    const deliveryId = Utilities.getUuid()

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
      const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('DELIVERY')
      sheet.appendRow([
        toUTCString(new Date()), // Timestamp
        data.branch,
        data.username,
        data.helperName,
        data.vehicleNumber,
        toUTCString(new Date(data.deliveryTime)),
        data.storeName,
        data.storeAddress,
        data.invoiceNumber,
        data.invoiceAmount,
        data.paymentType,
        data.status || 'Pending',
        uploadResults.checkin.url,
        data.location.latitude,
        data.location.longitude,
        JSON.stringify(data.location),
        deliveryId,
        uploadResults.delivery?.url || '',
        uploadResults.payment?.url || ''
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
    const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('DELIVERY')
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

function getDeliveries(data) {
  try {
    if (!data.branch) {
      return sendError('Branch parameter required')
    }

    const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('DELIVERY')
    const values = sheet.getDataRange().getValues()
    const headers = values.shift()

    let deliveries = values
      .filter(row => row[DeliveryCol.BRANCH] === data.branch)
      .map(mapDeliveryRow)

    // Apply date range filter if provided
    if (data.range) {
      const [startDate, endDate] = data.range.split(',').map(d => new Date(d))
      deliveries = deliveries.filter(d => {
        const deliveryDate = new Date(d.deliveryTime)
        return deliveryDate >= startDate && deliveryDate <= endDate
      })
    }

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

    const sheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('DELIVERY')
    const values = sheet.getDataRange().getValues()
    const headers = values.shift()

    let deliveries = values
      .filter(row => 
        row[DeliveryCol.BRANCH] === data.branch && 
        row[DeliveryCol.STATUS] === data.context
      )
      .map(mapDeliveryRow)

    // Apply date range filter if provided
    if (data.range) {
      const [startDate, endDate] = data.range.split(',').map(d => new Date(d))
      deliveries = deliveries.filter(d => {
        const deliveryDate = new Date(d.deliveryTime)
        return deliveryDate >= startDate && deliveryDate <= endDate
      })
    }

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
  try {
    if (!data.branch || !data.date) {
      return sendError('Branch dan date parameter diperlukan')
    }

    // Get invoices from invoice sheet
    const invoiceSheet = SpreadsheetApp.openById(INVOICE_SHEET_ID).getSheetByName('INVOICES')
    const invoiceData = invoiceSheet.getDataRange().getValues()
    const invoiceHeaders = invoiceData.shift()

    // Get existing deliveries
    const deliverySheet = SpreadsheetApp.openById(DELIVERY_SHEET_ID).getSheetByName('DELIVERY')
    const deliveryData = deliverySheet.getDataRange().getValues()
    const deliveryHeaders = deliveryData.shift()

    // Get all invoice numbers that are already in delivery
    const existingInvoices = new Set(
      deliveryData
        .filter(row => 
          row[DeliveryCol.STATUS] !== 'MINTA KIRIM ULANG' && 
          row[DeliveryCol.BRANCH] === data.branch
        )
        .map(row => row[DeliveryCol.INVOICE_NUMBER])
    )

    // Filter available invoices
    let invoices = invoiceData
      .filter(row => {
        const invoiceNumber = row[0] // Assuming invoice number is first column
        const invoiceBranch = row[1] // Assuming branch is second column
        return (
          invoiceBranch === data.branch && 
          !existingInvoices.has(invoiceNumber)
        )
      })
      .map(row => ({
        invoiceNumber: row[0],
        branch: row[1],
        amount: parseFloat(row[2]),
        date: row[3]
      }))

    // Apply date range filter if provided
    if (data.range) {
      const [startDate, endDate] = data.range.split(',').map(d => new Date(d))
      invoices = invoices.filter(inv => {
        const invoiceDate = new Date(inv.date)
        return invoiceDate >= startDate && invoiceDate <= endDate
      })
    }

    return sendResponse({
      success: true,
      data: { invoices }
    })

  } catch (error) {
    console.error('Get available invoices error:', error)
    return sendError('Terjadi kesalahan saat mengambil data invoice')
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

function toUTCString(date) {
  return Utilities.formatDate(date, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'")
}

function sendError(message, data = null) {
  return {
    success: false,
    message: message,
    data: data
  }
}

function sendResponse(response) {
  return response
}
