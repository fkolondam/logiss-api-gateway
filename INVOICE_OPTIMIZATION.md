# Optimasi Fungsi Invoice

## 1. Optimasi Query dengan Range Spesifik
```javascript
function getInvoiceList(branch, date) {
  try {
    if (!branch || !date) {
      return sendError('Parameter branch dan date diperlukan');
    }

    const dateParts = date.split('/');
    if (dateParts.length !== 3) {
      return sendError('Format tanggal tidak valid. Gunakan format m/d/yyyy');
    }

    const month = dateParts[0];
    const day = dateParts[1];
    const year = dateParts[2];

    const spreadsheet = SpreadsheetApp.openById(INVOICE_SHEET_ID);
    const sheet = spreadsheet.getSheetByName('Sales Header');
    
    // Get the data range dimensions
    const lastRow = sheet.getLastRow();
    const lastCol = 14; // Hanya ambil kolom yang dibutuhkan (0-13)
    
    // Skip header row
    const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const data = dataRange.getValues();

    // Buat index untuk branch yang diminta
    const branchData = new Map();
    data.forEach((row, index) => {
      if (row[3] === branch) {
        const key = `${row[0]}_${row[1]}_${row[2]}`; // year_month_day
        if (!branchData.has(key)) {
          branchData.set(key, []);
        }
        branchData.get(key).push(row);
      }
    });

    // Get data for specific date
    const dateKey = `${year}_${month}_${day}`;
    const matchingRows = branchData.get(dateKey) || [];

    const invoices = matchingRows.map(row => ({
      branchName: row[3],
      tanggalLengkap: `${month}/${day}/${year}`,
      nomorInvoice: row[13],
      namaCustomer: row[10],
      prinsipal: row[5]
    }));

    return sendResponse({
      success: true,
      data: {
        invoices: invoices,
        total: invoices.length,
        branch: branch,
        date: date
      }
    });

  } catch (error) {
    Logger.log(`Error in getInvoiceList: ${error}`);
    return sendError(`Gagal mengambil data invoice: ${error.toString()}`);
  }
}
```

## Optimasi yang Diterapkan:

1. Range Spesifik:
   - Menggunakan getRange dengan dimensi spesifik
   - Hanya mengambil kolom yang dibutuhkan
   - Skip header row langsung di query

2. Indexing:
   - Membuat index berdasarkan branch
   - Menggunakan Map untuk lookup cepat
   - Key kombinasi year_month_day untuk filtering tanggal

3. Menghindari Operasi Mahal:
   - Tidak menggunakan filter/reduce
   - Menghindari multiple string conversions
   - Menghindari multiple date operations

4. Memory Efficient:
   - Tidak menyimpan full dataset
   - Garbage collect temporary data
   - Efficient data structure usage

## Implementasi di API Gateway:

Di api.js, tambahkan timeout handling:
```javascript
case 'invoices':
  // Convert YYYY-MM-DD to M/D/YYYY
  const dateObj = new Date(params.date);
  if (isNaN(dateObj.getTime())) {
    return createResponse(400, {
      success: false,
      error: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD'
    }, { origin })
  }
  
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;
  
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 25000);
    });

    const gasPromise = fetchGas('getInvoiceList', { 
      branch: params.branch,
      date: formattedDate
    });

    const gasResponse = await Promise.race([gasPromise, timeoutPromise]);
    
    if (!gasResponse.success) {
      return createResponse(400, gasResponse, { origin });
    }
    
    return createResponse(200, gasResponse, { origin });
  } catch (error) {
    if (error.message === 'Request timeout') {
      return createResponse(504, {
        success: false,
        error: 'Request timeout. Please try again.'
      }, { origin });
    }
    throw error;
  }
  break;
```

## Expected Results:
1. Execution time < 10s untuk dataset normal
2. Konsisten response time
3. Tidak ada timeout di Postman
4. Memory usage lebih efisien

## Monitoring:
Tambahkan execution time logging:
```javascript
const startTime = new Date().getTime();
// ... existing code ...
const endTime = new Date().getTime();
Logger.log(`Execution time: ${endTime - startTime}ms`);
