# Dokumentasi API Expenses

## Endpoints

### 1. Get Expenses by Branch
```http
GET /api/expenses?branch={branch}&category={category}&range={range}
```

Parameters:
- `branch` (required): Kode cabang
- `category` (optional): Kategori pengeluaran
- `range` (optional): Range tanggal dalam format "YYYY-MM-DD,YYYY-MM-DD"

Response Success (200):
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "date": "1/27/2024",
        "username": "string",
        "sessionId": "string",
        "branch": "string",
        "licensePlate": "string",
        "category": "string",
        "subcategory": "string",
        "amount": "number",
        "description": "string",
        "receiptPhotoUrl": "string",
        "status": "string",
        "approvedBy": "string",
        "approvedAt": "string"
      }
    ],
    "total": "number",
    "branch": "string",
    "category": "string",
    "range": "string"
  }
}
```

### 2. Get Filtered Expenses
```http
GET /api/expenses?context={context}&range={range}
```

Parameters:
- `context` (required): Konteks filter (misal: nomor polisi kendaraan)
- `range` (optional): Range tanggal dalam format "YYYY-MM-DD,YYYY-MM-DD"

Response Success (200):
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "date": "1/27/2024",
        "username": "string",
        "sessionId": "string",
        "branch": "string",
        "licensePlate": "string",
        "category": "string",
        "subcategory": "string",
        "amount": "number",
        "description": "string",
        "receiptPhotoUrl": "string",
        "status": "string",
        "approvedBy": "string",
        "approvedAt": "string"
      }
    ],
    "total": "number",
    "context": "string",
    "range": "string"
  }
}
```

### 3. Submit Expense
```http
POST /api/expenses
```

Request Body:
```json
{
  "data": {
    "date": "string (YYYY-MM-DD)",
    "username": "string",
    "sessionId": "string",
    "branch": "string",
    "licensePlate": "string",
    "category": "string",
    "subcategory": "string",
    "amount": "number",
    "description": "string",
    "receiptPhoto": "base64 string (optional)",
    "status": "string",
    "approvedBy": "string (optional)",
    "approvedAt": "string (optional)"
  }
}
```

Response Success (200):
```json
{
  "success": true,
  "message": "Data pengeluaran berhasil ditambahkan."
}
```

## Error Responses

### 1. Missing Required Parameters
```json
{
  "success": false,
  "error": "Parameter branch diperlukan"
}
```

### 2. Invalid Data
```json
{
  "success": false,
  "error": "Data yang diperlukan tidak lengkap"
}
```

### 3. Authentication Error
```json
{
  "success": false,
  "error": "Authentication required"
}
```

## Notes
1. Semua endpoints expenses memerlukan authentication
2. Range tanggal default adalah hari ini jika tidak dispesifikasikan
3. Receipt photo akan diupload ke Google Drive folder yang sesuai
4. Status default untuk expense baru adalah 'Pending'

## Testing Guide

### 1. Get Expenses by Branch
```javascript
pm.test("Response structure is correct", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.have.property('expenses');
    pm.expect(jsonData.data.expenses).to.be.an('array');
});

pm.test("Expense object has required fields", function () {
    const jsonData = pm.response.json();
    if (jsonData.data.expenses.length > 0) {
        const expense = jsonData.data.expenses[0];
        pm.expect(expense).to.have.property('date');
        pm.expect(expense).to.have.property('amount');
        pm.expect(expense).to.have.property('category');
    }
});
```

### 2. Submit Expense
```javascript
pm.test("Submit expense successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.message).to.include('berhasil');
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
