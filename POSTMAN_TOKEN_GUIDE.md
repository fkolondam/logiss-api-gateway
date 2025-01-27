# Panduan Menyimpan Token di Postman

## 1. Setup Environment Variable untuk Token

1. Buka Environment yang sudah dibuat
2. Cari variable `token`
3. Biarkan Initial Value kosong
4. Token akan disimpan di Current Value

## 2. Menyimpan Token dari Login Response

### Cara Manual:
1. Setelah mendapat response login yang berisi token
2. Copy nilai token dari response
3. Paste ke Current Value dari variable `token`

### Cara Otomatis (Recommended):
1. Buka request Login
2. Buka tab "Tests"
3. Tambahkan script berikut:
```javascript
pm.test("Save token to environment", function () {
    var jsonData = pm.response.json();
    if (jsonData.success && jsonData.data.token) {
        pm.environment.set("token", jsonData.data.token);
        console.log("Token saved to environment");
    }
});
```

## 3. Menggunakan Token

Untuk request yang membutuhkan autentikasi (checkin, checkout), gunakan:
```
Authorization: Bearer {{token}}
```

## Tips:
1. Selalu gunakan Current Value untuk token karena sifatnya sementara
2. Initial Value biarkan kosong untuk keamanan
3. Token akan hilang saat:
   - Postman ditutup
   - Environment di-reset
   - Token expired (24 jam)
4. Jika token expired, lakukan login ulang untuk mendapatkan token baru

## Verifikasi Token Tersimpan:
1. Klik icon mata di samping Current Value
2. Token akan terlihat (untuk memastikan tersimpan)
3. Klik icon mata lagi untuk menyembunyikan token

## Troubleshooting:
- Jika mendapat error 401, cek:
  1. Apakah token tersimpan di environment
  2. Apakah format Authorization header benar
  3. Apakah token masih valid (belum expired)
