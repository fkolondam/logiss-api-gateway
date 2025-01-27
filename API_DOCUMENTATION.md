# Dokumentasi API Gateway Logiss

## Daftar Isi
1. [Konfigurasi](#konfigurasi)
2. [Autentikasi](#autentikasi)
3. [Endpoint API](#endpoint-api)
4. [Format Response](#format-response)
5. [Error Handling](#error-handling)
6. [Email Templates](#email-templates)
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
  - Sheet 'SESSIONS': Data check-in/check-out
- INVOICE_SHEET_ID: Data invoice
- VEHICLE_SHEET_ID: Data kendaraan
- USER_SHEET_ID: Data pengguna

## Autentikasi

### Token Authentication
- API menggunakan JWT (JSON Web Token) untuk autentikasi
- Token harus disertakan di header sebagai Bearer token:
  ```
  Authorization: Bearer <token>
  ```
- Token juga bisa disimpan dalam cookie (httpOnly)
- Masa berlaku token: 24 jam

### Protected Routes
Endpoint yang memerlukan autentikasi:
- /api/checkin
- /api/checkout
- /api/delivery

## Endpoint API

### 1. Login
```
POST /api/login
```
Request body:
```json
{
  "data": {
    "email": "string",
    "hashedPassword": "string"
  }
}
```
Response sukses:
```json
{
  "success": true,
  "data": {
    "email": "string",
    "fullName": "string",
    "role": "string",
    "branch": "string"
  }
}
```

### 2. Register
```
POST /api/register
```
Request body:
```json
{
  "data": {
    "email": "string",
    "hashedPassword": "string",
    "fullName": "string",
    "role": "string",
    "branch": "string",
    "activationToken": "string"
  }
}
```
Response sukses:
```json
{
  "success": true,
  "message": "Registrasi berhasil. Silakan cek email untuk aktivasi akun."
}
```

### 3. Aktivasi Akun
```
GET /api/activate?token={activation_token}
```
Parameters:
- token (required): Token aktivasi yang dikirim ke email

Response sukses:
```text
Akun berhasil diaktivasi. Silakan login.
```

### 4. Daftar Cabang
```
GET /api/branches
```
Response sukses:
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
Parameters:
- branch (required): Kode cabang

Response sukses:
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

### 6. Daftar Invoice
```
GET /api/invoices?branch={branch_code}
```
Parameters:
- branch (required): Kode cabang

Response sukses:
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

### 7. Check-in Kendaraan
```
POST /api/checkin
```
Headers:
- Authorization: Bearer {token}

Request body:
```json
{
  "data": {
    "username": "string",
    "branch": "string",
    "vehicleNumber": "string",
    "checkInTime": "string (ISO 8601)",
    "initialOdometer": "number",
    "checkInPhotoUrl": "string",
    "location": {
      "latitude": "number",
      "longitude": "number"
    }
  }
}
```

Response sukses:
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "message": "Check-in berhasil",
    "timestamp": "string (ISO 8601)"
  }
}
```

### 8. Check-out Kendaraan
```
POST /api/checkout
```
Headers:
- Authorization: Bearer {token}

Request body:
```json
{
  "data": {
    "sessionId": "string",
    "checkOutTime": "string (ISO 8601)",
    "finalOdometer": "number",
    "checkOutPhotoUrl": "string",
    "location": {
      "latitude": "number",
      "longitude": "number"
    }
  }
}
```

Response sukses:
```json
{
  "success": true,
  "data": {
    "message": "Check-out berhasil",
    "sessionDetails": {
      "duration": "string (format: HH:mm)",
      "distanceTraveled": "number (km)"
    }
  }
}
```

### 9. Submit Form Delivery
```
POST /api/delivery
```
Headers:
- Authorization: Bearer {token}

Request body:
```json
{
  "data": {
    "branch": "string",
    "licensePlate": "string",
    "driverName": "string",
    "destination": "string",
    "items": [
      {
        "name": "string",
        "quantity": "number"
      }
    ]
  }
}
```
Response sukses:
```json
{
  "success": true,
  "message": "Form submitted successfully!"
}
```

## Format Response

### Sukses Response
```json
{
  "success": true,
  "data": {
    // Data response sesuai endpoint
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Pesan error"
}
```

## Error Handling

### Kode Status HTTP
- 200: Sukses
- 204: Sukses (tidak ada content) - untuk OPTIONS request
- 400: Bad Request - parameter tidak valid
- 401: Unauthorized - token tidak ada atau tidak valid
- 404: Not Found - endpoint tidak ditemukan
- 500: Internal Server Error - error server

### Error Messages Spesifik

#### Authentication Errors
```json
{
  "success": false,
  "message": "Authentication required"
}
```
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

#### Login/Register Errors
```json
{
  "success": false,
  "message": "Email atau password salah"
}
```
```json
{
  "success": false,
  "message": "Email sudah terdaftar"
}
```
```json
{
  "success": false,
  "message": "Akun belum diaktivasi"
}
```

#### Check-in/Check-out Errors
```json
{
  "success": false,
  "error": "Lokasi Anda terlalu jauh dari cabang",
  "data": {
    "distance": "number (dalam meter)",
    "maxAllowedDistance": "number (dalam meter)"
  }
}
```
```json
{
  "success": false,
  "error": "Kendaraan sedang digunakan",
  "data": {
    "currentSession": {
      "username": "string",
      "checkInTime": "string (ISO 8601)"
    }
  }
}
```

## Session Management

### Struktur Data Sessions (BRANCH_SHEET_ID, Sheet 'SESSIONS')
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| Timestamp | DateTime | Waktu record dibuat |
| Username | String | Username pengguna |
| Branch | String | Kode cabang |
| Vehicle Number | String | Nomor polisi kendaraan |
| Check In Time | DateTime | Waktu check-in |
| Check Out Time | DateTime | Waktu check-out |
| Initial Odometer | Number | Odometer awal |
| Final Odometer | Number | Odometer akhir |
| Check In Photo URL | String | URL foto saat check-in |
| Check Out Photo URL | String | URL foto saat check-out |
| Status | String | Status session (Active/Completed) |

### Aturan Session
1. Satu kendaraan hanya bisa memiliki satu session aktif per hari
2. Session harus di-complete (check-out) sebelum kendaraan bisa di-check-in lagi
3. Hanya user yang melakukan check-in yang bisa melakukan check-out
4. Final odometer harus lebih besar dari initial odometer
5. Foto wajib disertakan saat check-in dan check-out

## Geofencing

### Konfigurasi Radius
- Development: 10 kilometer
- Production: 100 meter

### Formula Haversine
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
```

## Email Templates

### Email Aktivasi Akun
Subject: `Aktivasi Akun {APP_NAME}`

Template:
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e3a8a;">Aktivasi Akun {APP_NAME}</h2>
  <p>Halo {name},</p>
  <p>Terima kasih telah mendaftar di {APP_NAME}. Untuk mengaktifkan akun Anda, silakan klik tombol di bawah ini:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{activationLink}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
      Aktivasi Akun
    </a>
  </div>
  <p>Atau salin dan tempel link berikut di browser Anda:</p>
  <p style="background-color: #f3f4f6; padding: 10px; word-break: break-all;">
    {activationLink}
  </p>
  <p>Link aktivasi ini akan kadaluarsa dalam 24 jam.</p>
  <p>Jika Anda tidak merasa mendaftar di {APP_NAME}, Anda dapat mengabaikan email ini.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="color: #6b7280; font-size: 12px;">
    Email ini dikirim secara otomatis, mohon tidak membalas email ini.
  </p>
</div>
```

## Catatan Penting
1. Semua request yang membutuhkan autentikasi harus menyertakan token
2. Password harus di-hash di sisi client sebelum dikirim ke server
3. Token aktivasi dibuat di sisi client dan dikirim saat registrasi
4. Response selalu dalam format JSON kecuali untuk aktivasi akun (text)
5. Untuk environment development, CORS diizinkan untuk semua origin
6. Untuk production, CORS hanya diizinkan untuk domain yang terdaftar di ALLOWED_ORIGINS
7. Email aktivasi memiliki masa berlaku 24 jam
8. Data disimpan dalam Google Sheets dengan struktur yang telah ditentukan
9. Validasi geofencing menggunakan formula Haversine
10. Session management menggunakan status Active/Completed
11. Foto wajib untuk check-in dan check-out
12. Odometer final harus lebih besar dari odometer awal
