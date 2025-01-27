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

// Tambahkan ke doGet handler
function doGet(e) {
  // Validate API Key from URL parameter
  const apiKey = getParam(e, 'key')
  if (apiKey !== API_KEY) {
    return sendError('Invalid API Key')
  }

  const action = getParam(e, 'action')
  console.log('doGet action:', action)

  switch (action) {
    case 'getBranchConfig':
      return getBranchConfig()
    case 'getInvoiceList':
      return getInvoiceList(getParam(e, 'branch'), getParam(e, 'date'))
    case 'getRangedInvoiceList':  // Add new action
      return getRangedInvoiceList(getParam(e, 'branch'), getParam(e, 'date'))
    case 'getVehicleData':
      return getVehicleData(getParam(e, 'branch'))
    case 'activateAccount':
      return activateAccount(getParam(e, 'token'))
    case 'getActiveSessions':
      return getActiveSessions(getParam(e, 'branch'))
    default:
      return sendError('Invalid action')
  }
}
