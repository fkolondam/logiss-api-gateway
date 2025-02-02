# Delivery API Guide

## Endpoints

### 1. Submit Delivery
POST `/api/delivery`

Submit new delivery data with photos.

Headers:
```
Authorization: Bearer {token}
Content-Type: application/json
```

Body:
```json
{
  "data": {
    "branch": "RDA MANADO",
    "helperName": "John Helper",
    "vehicleNumber": "DB1234XX",
    "deliveryTime": "2024-02-01T08:00:00Z",
    "storeName": "Toko ABC",
    "storeAddress": "Jl. Sample No. 123",
    "invoiceNumber": "INV/2024/001",
    "invoiceAmount": 1500000,
    "paymentType": "CASH",
    "deliveryCheckinPhoto": "data:image/jpeg;base64,...", // Required
    "deliveryPhoto": "data:image/jpeg;base64,...",      // Optional
    "paymentPhoto": "data:image/jpeg;base64,...",       // Optional
    "location": {
      "latitude": 1.4895397,
      "longitude": 124.8754042
    }
  }
}
```

Success Response (200):
```json
{
  "success": true,
  "data": {
    "deliveryId": "5c38083d-ec16-4228-b857-558d8b06079c",
    "checkinPhotoUrl": "https://drive.google.com/...",
    "deliveryPhotoUrl": "https://drive.google.com/...",
    "paymentPhotoUrl": "https://drive.google.com/..."
  }
}
```

Error Response (400):
```json
{
  "success": false,
  "error": "Data tidak lengkap"
}
```

### 2. Get Single Delivery
GET `/api/delivery?id={deliveryId}`

Get delivery details by ID.

Headers:
```
Authorization: Bearer {token}
```

Success Response (200):
```json
{
  "success": true,
  "data": {
    "id": "5c38083d-ec16-4228-b857-558d8b06079c",
    "timestamp": "2024-02-01T08:00:00Z",
    "branch": "RDA MANADO",
    "driverName": "John Driver",
    "helperName": "John Helper",
    "vehicleNumber": "DB1234XX",
    "deliveryTime": "2024-02-01T08:00:00Z",
    "storeName": "Toko ABC",
    "storeAddress": "Jl. Sample No. 123",
    "invoiceNumber": "INV/2024/001",
    "invoiceAmount": 1500000,
    "paymentType": "CASH",
    "status": "Pending",
    "checkinPhotoUrl": "https://drive.google.com/...",
    "deliveryPhotoUrl": "https://drive.google.com/...",
    "paymentPhotoUrl": "https://drive.google.com/...",
    "location": {
      "latitude": 1.4895397,
      "longitude": 124.8754042,
      "raw": "{\"latitude\":1.4895397,\"longitude\":124.8754042}"
    }
  }
}
```

Error Response (404):
```json
{
  "success": false,
  "error": "Data pengiriman tidak ditemukan"
}
```

### 3. Get Deliveries List
GET `/api/delivery?branch={branchName}&range={dateRange}`

Get list of deliveries filtered by branch and date range.

Headers:
```
Authorization: Bearer {token}
```

Query Parameters:
- branch: Branch name (required)
- range: Date range in format "YYYY-MM-DD,YYYY-MM-DD" (optional)

Success Response (200):
```json
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "id": "5c38083d-ec16-4228-b857-558d8b06079c",
        "timestamp": "2024-02-01T08:00:00Z",
        "branch": "RDA MANADO",
        "driverName": "John Driver",
        "helperName": "John Helper",
        "vehicleNumber": "DB1234XX",
        "deliveryTime": "2024-02-01T08:00:00Z",
        "storeName": "Toko ABC",
        "storeAddress": "Jl. Sample No. 123",
        "invoiceNumber": "INV/2024/001",
        "invoiceAmount": 1500000,
        "paymentType": "CASH",
        "status": "Pending",
        "checkinPhotoUrl": "https://drive.google.com/...",
        "deliveryPhotoUrl": "https://drive.google.com/...",
        "paymentPhotoUrl": "https://drive.google.com/...",
        "location": {
          "latitude": 1.4895397,
          "longitude": 124.8754042,
          "raw": "{\"latitude\":1.4895397,\"longitude\":124.8754042}"
        }
      }
      // ... more deliveries
    ]
  }
}
```

Error Response (400):
```json
{
  "success": false,
  "error": "Parameter branch diperlukan"
}
```

### 4. Get Deliveries by Context
GET `/api/delivery?branch={branchName}&context={status}&range={dateRange}`

Get list of deliveries filtered by branch, status and date range.

Headers:
```
Authorization: Bearer {token}
```

Query Parameters:
- branch: Branch name (required)
- context: Delivery status (required)
- range: Date range in format "YYYY-MM-DD,YYYY-MM-DD" (optional)

Success Response (200):
```json
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "id": "5c38083d-ec16-4228-b857-558d8b06079c",
        "timestamp": "2024-02-01T08:00:00Z",
        "branch": "RDA MANADO",
        "driverName": "John Driver",
        "helperName": "John Helper",
        "vehicleNumber": "DB1234XX",
        "deliveryTime": "2024-02-01T08:00:00Z",
        "storeName": "Toko ABC",
        "storeAddress": "Jl. Sample No. 123",
        "invoiceNumber": "INV/2024/001",
        "invoiceAmount": 1500000,
        "paymentType": "CASH",
        "status": "Pending",
        "checkinPhotoUrl": "https://drive.google.com/...",
        "deliveryPhotoUrl": "https://drive.google.com/...",
        "paymentPhotoUrl": "https://drive.google.com/...",
        "location": {
          "latitude": 1.4895397,
          "longitude": 124.8754042,
          "raw": "{\"latitude\":1.4895397,\"longitude\":124.8754042}"
        }
      }
      // ... more deliveries with matching status
    ]
  }
}
```

Error Response (400):
```json
{
  "success": false,
  "error": "Branch dan context parameter diperlukan"
}
```

### 5. Get Available Invoices
GET `/api/available-invoices?branch={branchName}&date={date}&range={dateRange}`

Get list of invoices available for delivery.

Headers:
```
Authorization: Bearer {token}
```

Query Parameters:
- branch: Branch name (required)
- date: Base date in format "YYYY-MM-DD" (required)
- range: Date range in format "YYYY-MM-DD,YYYY-MM-DD" (optional)

Success Response (200):
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "invoiceNumber": "INV/2024/001",
        "branch": "RDA MANADO",
        "amount": 1500000,
        "date": "2024-02-01"
      },
      // ... more available invoices
    ]
  }
}
```

Error Response (400):
```json
{
  "success": false,
  "error": "Branch dan date parameter diperlukan"
}
```

## Test Scenarios

### Submit Delivery
1. Submit with complete data - Should succeed
2. Submit without required fields - Should fail with specific error
3. Submit with invalid photo format - Should fail with format error
4. Submit with invalid location format - Should fail with format error
5. Submit with invalid payment type - Should fail with validation error

### Get Single Delivery
1. Get with valid ID - Should return delivery data
2. Get with invalid ID - Should return not found error
3. Get without ID - Should return validation error
4. Get with unauthorized token - Should return auth error

### Get Deliveries List
1. Get with valid branch - Should return list
2. Get without branch - Should return validation error
3. Get with date range - Should return filtered list
4. Get with invalid date range - Should return validation error

### Get Deliveries by Context
1. Get with valid branch and context - Should return filtered list
2. Get without branch or context - Should return validation error
3. Get with date range - Should return filtered list
4. Get with invalid status - Should return empty list

### Get Available Invoices
1. Get with valid branch and date - Should return available invoices
2. Get without required parameters - Should return validation error
3. Get with date range - Should return filtered invoices
4. Get with invalid date format - Should return validation error

## Common HTTP Status Codes
- 200: Success
- 400: Bad Request (validation error)
- 401: Unauthorized (invalid/missing token)
- 404: Not Found
- 500: Internal Server Error

## Notes
- All dates should be in UTC timezone
- Photo data should be base64 encoded with data URL prefix
- Location coordinates should be numbers
- Token must be included in Authorization header
- Branch names must match exactly
