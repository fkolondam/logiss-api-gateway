# Dokumentasi API Gateway Logiss

## Daftar Isi
1. [Konfigurasi](#konfigurasi)
2. [Autentikasi](#autentikasi)
3. [Endpoint API](#endpoint-api)
4. [Format Response](#format-response)
5. [Error Handling](#error-handling)
6. [Validasi](#validasi)
7. [Geofencing](#geofencing)
8. [Session Management](#session-management)

## Konfigurasi

### Environment Variables
```env
GAS_URL=<Google Apps Script URL>
GAS_API_KEY=<API Key>
JWT_SECRET=<JWT Secret Key>
ALLOWED_ORIGINS=<Comma separated allowed origins>
```

### Google Apps Script Sheets
- BRANCH_SHEET_ID: Konfigurasi cabang dan data sessions
  - Sheet 'BRANCH': Data cabang
  - Sheet 'Users': Data user dan status aktivasi
  - Sheet 'SESSIONS': Data check-in/check-out
- INVOICE_SHEET_ID: Data invoice
  - Sheet 'Sales Header': Data invoice
- VEHICLE_SHEET_ID: Data kendaraan
  - Sheet 'LOGISTIC': Data kendaraan
- USER_SHEET_ID: memiliki ID yang sama dengan BRANCH_SHEET_ID

## Autentikasi

### Flow Autentikasi
1. Register -> Mendapat activation token
2. Aktivasi -> Menggunakan token untuk aktivasi akun
3. Login -> Mendapat JWT token
4. Protected Routes -> Menggunakan JWT token

### JWT Token
- Format: Bearer token
- Expires: 24 jam
- Payload:
  ```json
  {
    "email": "string",
    "fullName": "string",
    "role": "string",
    "branch": "string"
  }
  ```

### Protected Routes
Endpoint yang memerlukan autentikasi:
- /api/checkin
- /api/checkout
- /api/delivery

## Endpoint API

### 1. Register
```
POST /api/register
```
Request:
```json
{
  "data": {
    "email": "string",
    "hashedPassword": "string (hashed di client)",
    "fullName": "string",
    "role": "string (Driver/Admin)",
    "branch": "string (kode cabang)",
    "activationToken": "string (UUID v4)"
  }
}
```
Response Success (200):
```json
{
  "success": true,
  "message": "Registrasi berhasil. Silakan cek email untuk aktivasi akun."
}
```
Response Error (400):
```json
{
  "success": false,
  "message": "Email sudah terdaftar"
}
```

### 2. Aktivasi Akun
```
GET /api/activate?token={activation_token}
```
Response Success (200):
```json
{
  "success": true,
  "message": "Akun berhasil diaktivasi. Silakan login."
}
```
Response Error (400):
```json
{
  "success": false,
  "message": "Token aktivasi tidak valid"
}
```

### 3. Login
```
POST /api/login
```
Request:
```json
{
  "data": {
    "email": "string",
    "hashedPassword": "string (hashed di client)"
  }
}
```
Response Success (200):
```json
{
  "success": true,
  "data": {
    "email": "string",
    "fullName": "string",
    "role": "string",
    "branch": "string",
    "token": "string (JWT token)"
  }
}
```
Response Error (400):
```json
{
  "success": false,
  "message": "Email atau password salah"
}
```

### 4. Daftar Cabang
```
GET /api/branches
```
Response Success (200):
```json
{
  "success": true,
  "data": {
    "branches": [
      {
        "branchId": "string",
        "branchName": "string",
        "region": "string",
        "address": "string",
        "coordinates": {
          "lat": "number",
          "long": "number"
        }
      }
    ]
  }
}
```

### 5. Daftar Kendaraan
```
GET /api/vehicles?branch={branch_code}
```
Response Success (200):
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "licensePlate": "string",
        "vehicleName": "string",
        "vehicleCategory": "string"
      }
    ]
  }
}
```

### 6. Check-in Kendaraan
```
POST /api/checkin
```
Headers:
```
Authorization: Bearer {jwt_token}
```
Request:
```json
{
  "data": {
    "branch": "string",
    "vehicleNumber": "string",
    "checkInTime": "string (ISO 8601 UTC)",
    "initialOdometer": "number",
    "checkInPhotoUrl": "string",
    "location": {
      "latitude": "number",
      "longitude": "number"
    }
  }
}
```
Response Success (200):
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "message": "Check-in berhasil",
    "timestamp": "string (ISO 8601 UTC)"
  }
}
```
Response Error (400):
```json
{
  "success": false,
  "message": "Kendaraan sedang digunakan",
  "details": {
    "currentSession": {
      "sessionId": "string",
      "username": "string",
      "checkInTime": "string"
    }
  }
}
```

### 7. Check-out Kendaraan
```
POST /api/checkout
```
Headers:
```
Authorization: Bearer {jwt_token}
```
Request:
```json
{
  "data": {
    "sessionId": "string",
    "checkOutTime": "string (ISO 8601 UTC)",
    "finalOdometer": "number",
    "checkOutPhotoUrl": "string",
    "location": {
      "latitude": "number",
      "longitude": "number"
    }
  }
}
```
Response Success (200):
```json
{
  "success": true,
  "data": {
    "message": "Check-out berhasil",
    "sessionId": "string",
    "distanceTraveled": "number",
    "checkOutTime": "string (ISO 8601 UTC)"
  }
}
```

### 8. Daftar Invoice
```
GET /api/invoices?branch={branch_code}
```
Response Success (200):
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "branchName": "string",
        "tanggalLengkap": "string",
        "nomorInvoice": "string",
        "namaCustomer": "string"
      }
    ]
  }
}
```

## Format Response

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```
atau
```json
{
  "success": true,
  "message": "string"
}
```

### Error Response
```json
{
  "success": false,
  "message": "string",
  "details": {
    // Optional error details
  }
}
```

## Error Handling

### HTTP Status Codes
- 200: Success
- 204: No Content (OPTIONS request)
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

### Common Error Messages
1. Authentication:
   - "Authentication required"
   - "Invalid or expired token"
   - "Token aktivasi tidak valid"

2. Validation:
   - "Data tidak lengkap"
   - "Email sudah terdaftar"
   - "Email atau password salah"

3. Business Logic:
   - "Kendaraan sedang digunakan"
   - "Session tidak ditemukan"
   - "Session sudah selesai"
   - "Lokasi terlalu jauh dari cabang"

## Validasi

### Register
1. Email:
   - Format email valid
   - Belum terdaftar
2. Password:
   - Harus di-hash di client
3. Role:
   - "Driver" atau "Admin"
4. Branch:
   - Kode cabang harus valid
5. Activation Token:
   - Format UUID v4

### Login
1. Email:
   - Harus terdaftar
   - Akun harus sudah diaktivasi
2. Password:
   - Hash harus cocok

### Check-in
1. Location:
   - Dalam radius yang diizinkan dari cabang
2. Vehicle:
   - Tidak sedang digunakan
3. Time:
   - Format ISO 8601 UTC

### Check-out
1. Session:
   - Harus active
   - User harus sama dengan yang check-in
2. Odometer:
   - Final > Initial
3. Location:
   - Dalam radius yang diizinkan

## Geofencing

### Radius
- Development: 10 kilometer
- Production: 100 meter

### Validasi
```javascript
const distance = calculateDistance(userLat, userLon, branchLat, branchLon)
const maxDistance = isDev ? 10000 : 100 // meters
return distance <= maxDistance
```

## Session Management

### Status Session
- Active: Check-in berhasil, belum check-out
- Completed: Sudah check-out

### Validasi Session
1. Satu kendaraan hanya bisa memiliki satu session active
2. Session harus di-complete sebelum kendaraan bisa di-check-in lagi
3. Hanya user yang check-in yang bisa check-out
4. Validasi berdasarkan tanggal (UTC)

### Data Session
```javascript
{
  sessionId: "UUID v4",
  timestamp: "ISO 8601 UTC",
  username: "string",
  branch: "string",
  vehicleNumber: "string",
  checkInTime: "ISO 8601 UTC",
  checkOutTime: "ISO 8601 UTC",
  initialOdometer: "number",
  finalOdometer: "number",
  checkInPhotoUrl: "string",
  checkOutPhotoUrl: "string",
  status: "Active|Completed"
}
```

### Struktur Sheet
#### Sheet 'BRANCH'
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| Branch ID | String | Kode unik cabang |
| Branch Name | String | Nama cabang |
| Region | String | Wilayah cabang |
| Address | String | Alamat lengkap |
| Latitude | Number | Koordinat latitude |
| Longitude | Number | Koordinat longitude |

#### Sheet 'Users'
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| Email | String | Email user (unique) |
| Password | String | Password yang sudah di-hash |
| Full Name | String | Nama lengkap |
| Active | Boolean | Status aktivasi |
| Last Login | DateTime | Waktu login terakhir |
| Activation Token | String | Token aktivasi (UUID) |
| Role | String | Driver/Admin |
| Branch | String | Kode cabang |

#### Sheet 'SESSIONS'
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| Session ID | String | UUID v4 |
| Timestamp | DateTime | Waktu record dibuat |
| Username | String | Email user |
| Branch | String | Kode cabang |
| Vehicle Number | String | Nomor polisi |
| Check In Time | DateTime | Waktu check-in |
| Check Out Time | DateTime | Waktu check-out |
| Initial Odometer | Number | Odometer awal |
| Final Odometer | Number | Odometer akhir |
| Check In Photo URL | String | URL foto check-in |
| Check Out Photo URL | String | URL foto check-out |
| Status | String | Active/Completed |

#### Sheet 'LOGISTIC'
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| Branch | String | Kode cabang |
| License Plate | String | Nomor polisi |
| Vehicle Name | String | Nama kendaraan |
| Vehicle Category | String | Kategori kendaraan |

#### Sheet 'Sales Header'
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| Branch Name | String | Nama cabang |
| Tanggal Lengkap | DateTime | Tanggal invoice |
| Nomor Invoice | String | Nomor invoice |
| Nama Customer | String | Nama pelanggan |
