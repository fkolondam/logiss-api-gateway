# Panduan Testing Endpoint Invoices

## Endpoint
```
GET /api/invoices
```

## Query Parameters
- branch (required): Kode cabang
- date (required): Format YYYY-MM-DD (akan dikonversi ke M/D/YYYY untuk Google Sheet)

## Test Cases di Postman

### 1. Setup Environment Variables
```
base_url: http://localhost:8888
branch: RDA MANADO
```

### 2. Test Case: Get Invoices Success
Request:
```http
GET {{base_url}}/api/invoices?branch=RDA MANADO&date=2024-01-27
```

Expected Response (200):
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "branchName": "RDA MANADO",
        "tanggalLengkap": "1/27/2024",
        "nomorInvoice": "INV001",
        "namaCustomer": "Customer A",
        "prinsipal": "Principal A"
      }
    ],
    "total": 1,
    "branch": "RDA MANADO",
    "date": "1/27/2024"
  }
}
```

### 3. Test Case: Missing Branch
Request:
```http
GET {{base_url}}/api/invoices?date=2024-01-27
```

Expected Response (400):
```json
{
  "success": false,
  "error": "Parameter branch diperlukan"
}
```

### 4. Test Case: Missing Date
Request:
```http
GET {{base_url}}/api/invoices?branch=RDA MANADO
```

Expected Response (400):
```json
{
  "success": false,
  "error": "Parameter date diperlukan"
}
```

### 5. Test Case: Invalid Date Format
Request:
```http
GET {{base_url}}/api/invoices?branch=RDA MANADO&date=27-01-2024
```

Expected Response (400):
```json
{
  "success": false,
  "error": "Format tanggal tidak valid. Gunakan format YYYY-MM-DD"
}
```

### 6. Test Case: No Data Found
Request:
```http
GET {{base_url}}/api/invoices?branch=RDA MANADO&date=2024-01-01
```

Expected Response (200):
```json
{
  "success": true,
  "data": {
    "invoices": [],
    "total": 0,
    "branch": "RDA MANADO",
    "date": "1/1/2024"
  }
}
```

## Postman Tests Script
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has correct structure", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData).to.have.property('data');
    pm.expect(jsonData.data).to.have.property('invoices').to.be.an('array');
    pm.expect(jsonData.data).to.have.property('total').to.be.a('number');
    pm.expect(jsonData.data).to.have.property('branch').to.be.a('string');
    pm.expect(jsonData.data).to.have.property('date').to.be.a('string');
});

if (pm.response.code === 200 && pm.response.json().data.invoices.length > 0) {
    pm.test("Invoice objects have required fields", function () {
        const invoice = pm.response.json().data.invoices[0];
        pm.expect(invoice).to.have.property('branchName');
        pm.expect(invoice).to.have.property('tanggalLengkap');
        pm.expect(invoice).to.have.property('nomorInvoice');
        pm.expect(invoice).to.have.property('namaCustomer');
        pm.expect(invoice).to.have.property('prinsipal');
    });
}

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(25000);
});
```

## Catatan Penting
1. Format Tanggal:
   - Input API: YYYY-MM-DD
   - Google Sheet: M/D/YYYY
   - Konversi dilakukan otomatis di API Gateway

2. Struktur Sheet:
   - Kolom tahun: index 0
   - Kolom bulan: index 1
   - Kolom tanggal: index 2
   - Branch: index 3
   - Prinsipal: index 5
   - Customer: index 10
   - Tanggal Lengkap: index 12
   - Nomor Invoice: index 13

3. Performance:
   - Timeout set ke 25 detik
   - Frontend akan meng-cache hasil untuk optimasi
   - Gunakan parameter yang spesifik untuk mengurangi jumlah data

4. Error Handling:
   - Validasi format tanggal
   - Validasi required parameters
   - Timeout handling
   - Response format consistency
