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
