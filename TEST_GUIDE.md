# Panduan Testing API Checkin 
# test

## 1. Login Terlebih Dahulu
```bash
curl -X POST http://localhost:8888/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "email": "user@example.com",
      "hashedPassword": "your_hashed_password"
    }
  }'
```

## 2. Simpan Token dari Response Login
Response akan berisi token yang diperlukan untuk checkin:
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "fullName": "User Name",
    "role": "driver",
    "branch": "RDA GORONTALO",
    "token": "your_jwt_token"
  }
}
```

## 3. Test Endpoint Checkin
```bash
curl -X POST http://localhost:8888/api/checkin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
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
  }'
```

## 4. Test Endpoint Checkout
```bash
curl -X POST http://localhost:8888/api/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "data": {
      "sessionId": "session_id_from_checkin",
      "checkOutTime": "2024-01-20T17:00:00Z",
      "finalOdometer": 50150,
      "checkOutPhotoUrl": "https://example.com/photo_out.jpg",
      "location": {
        "latitude": -0.5333333,
        "longitude": 123.0666667
      }
    }
  }'
```

## Catatan Penting:
1. Pastikan token JWT valid dan belum expired
2. Koordinat lokasi harus dalam radius yang diizinkan:
   - Development: 10km dari koordinat cabang
   - Production: 100m dari koordinat cabang
3. Odometer akhir harus lebih besar dari odometer awal
4. Satu kendaraan hanya bisa memiliki satu session aktif
5. URL foto harus valid dan dapat diakses

## Error yang Mungkin Muncul:
1. 401 Unauthorized:
   - Token tidak ada
   - Token tidak valid/expired
2. 400 Bad Request:
   - Data tidak lengkap
   - Lokasi terlalu jauh
   - Odometer tidak valid
3. 404 Not Found:
   - Session tidak ditemukan (saat checkout)
   - Cabang tidak ditemukan
4. 500 Internal Server Error:
   - Kesalahan server
   - Kesalahan koneksi ke Google Apps Script
