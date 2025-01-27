# Panduan Testing API dengan Postman

## Setup Collection

1. Buat Collection Baru di Postman
   - Klik "New" -> "Collection"
   - Nama: "Logiss API Gateway"
   - Buat environment variable:
     - `base_url`: http://localhost:8888
     - `token`: (kosong dulu, akan diisi setelah login)

## 1. Login

1. Buat Request Baru
   - Method: POST
   - URL: {{base_url}}/api/login
   - Headers:
     ```
     Content-Type: application/json
     ```
   - Body (raw JSON):
     ```json
     {
       "data": {
         "email": "user@example.com",
         "hashedPassword": "your_hashed_password"
       }
     }
     ```
   - Send Request
   - Dari response, copy token dan simpan ke environment variable `token`

## 2. Get Daftar Cabang

1. Buat Request Baru
   - Method: GET
   - URL: {{base_url}}/api/branches
   - Headers:
     ```
     Content-Type: application/json
     ```
   - Send Request
   - Dari response, catat `branchId` yang akan digunakan

## 3. Get Daftar Kendaraan

1. Buat Request Baru
   - Method: GET
   - URL: {{base_url}}/api/vehicles?branch=RDA%20GORONTALO
   - Headers:
     ```
     Content-Type: application/json
     ```
   - Send Request
   - Dari response, catat `licensePlate` yang akan digunakan

## 4. Check-in

1. Buat Request Baru
   - Method: POST
   - URL: {{base_url}}/api/checkin
   - Headers:
     ```
     Content-Type: application/json
     Authorization: Bearer {{token}}
     ```
   - Body (raw JSON):
     ```json
     {
       "data": {
         "branch": "RDA GORONTALO",
         "vehicleNumber": "B91525CP",
         "checkInTime": "2024-01-20T08:00:00Z",
         "initialOdometer": 50000,
         "checkInPhotoUrl": "https://example.com/photo.jpg",
         "location": {
           "latitude": -0.5333333,
           "longitude": 123.0666667
         }
       }
     }
     ```
   - Send Request
   - Dari response, catat `sessionId` untuk checkout

## 5. Check-out

1. Buat Request Baru
   - Method: POST
   - URL: {{base_url}}/api/checkout
   - Headers:
     ```
     Content-Type: application/json
     Authorization: Bearer {{token}}
     ```
   - Body (raw JSON):
     ```json
     {
       "data": {
         "sessionId": "session_id_dari_checkin",
         "checkOutTime": "2024-01-20T17:00:00Z",
         "finalOdometer": 50150,
         "checkOutPhotoUrl": "https://example.com/photo_out.jpg",
         "location": {
           "latitude": -0.5333333,
           "longitude": 123.0666667
         }
       }
     }
     ```
   - Send Request

## Test Cases untuk Validasi

### 1. Test Autentikasi
- Coba checkin tanpa token
- Coba checkin dengan token invalid
- Coba checkin dengan token expired

### 2. Test Geofencing
- Coba checkin dengan koordinat dalam radius (sukses)
```json
{
  "latitude": -0.5333333,
  "longitude": 123.0666667
}
```
- Coba checkin dengan koordinat luar radius (gagal)
```json
{
  "latitude": -0.9333333,
  "longitude": 123.5666667
}
```

### 3. Test Session Management
1. Checkin kendaraan A (sukses)
2. Coba checkin kendaraan A lagi (gagal - sudah ada session aktif)
3. Checkout kendaraan A (sukses)
4. Checkin kendaraan A lagi (sukses - session sebelumnya sudah selesai)

### 4. Test Validasi Odometer
- Checkout dengan odometer akhir lebih kecil (gagal)
- Checkout dengan odometer akhir sama (gagal)
- Checkout dengan odometer akhir lebih besar (sukses)

## Expected Responses

### Success Response (200)
```json
{
  "success": true,
  "data": {
    // Response data sesuai endpoint
  }
}
```

### Error Responses

1. Authentication Error (401)
```json
{
  "success": false,
  "error": "Authentication required"
}
```

2. Invalid Location (400)
```json
{
  "success": false,
  "error": "Lokasi terlalu jauh dari cabang",
  "data": {
    "distance": 15000,
    "maxAllowedDistance": 10000
  }
}
```

3. Vehicle Not Available (400)
```json
{
  "success": false,
  "error": "Kendaraan sedang digunakan"
}
```

4. Invalid Odometer (400)
```json
{
  "success": false,
  "error": "Odometer akhir harus lebih besar dari odometer awal"
}
```

## Tips Testing
1. Gunakan Postman Environment untuk menyimpan variabel yang sering berubah
2. Gunakan Postman Tests untuk otomasi validasi response
3. Simpan token di environment variable setelah login
4. Gunakan Pre-request Script untuk set timestamp otomatis
5. Cek response headers untuk debugging CORS issues

## Contoh Pre-request Script untuk Timestamp Otomatis
```javascript
// Set current time as checkInTime/checkOutTime
pm.environment.set('currentTime', new Date().toISOString());
```

Kemudian di body request bisa menggunakan:
```json
{
  "checkInTime": "{{currentTime}}"
}
