# Panduan Testing API Endpoint Logout dan Reset Password

## Endpoint Logout

### 1. POST /api/logout
Endpoint ini digunakan untuk melakukan logout user dan menghapus sesi yang aktif.

**Headers:**
```
Authorization: Bearer {token_jwt}
Content-Type: application/json
```

**Request Body:**
```json
{
    "data": {
        "email": "user@example.com"
    }
}
```

**Response Success (200):**
```json
{
    "success": true,
    "message": "Logout berhasil"
}
```

**Response Error (400/401):**
```json
{
    "success": false,
    "error": "Tidak dapat logout. Anda masih memiliki sesi check-in yang aktif."
}
```
atau
```json
{
    "success": false,
    "error": "Token tidak valid"
}
```

**Catatan Penting:**
- Token JWT harus disertakan di header Authorization
- Email harus sesuai dengan email yang ada di token JWT
- Pastikan tidak ada sesi check-in yang aktif sebelum logout

## Endpoint Reset Password

### 1. POST /api/forgot-password
Endpoint ini digunakan untuk meminta reset password. Sistem akan mengirimkan email yang berisi token reset password.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "data": {
        "email": "user@example.com"
    }
}
```

**Response Success (200):**
```json
{
    "success": true,
    "message": "Email reset password telah dikirim"
}
```

**Response Error (400):**
```json
{
    "success": false,
    "error": "Email tidak terdaftar"
}
```

### 2. POST /api/reset-password
Endpoint ini digunakan untuk melakukan reset password dengan token yang diterima melalui email.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "data": {
        "token": "reset_token_dari_email",
        "newPassword": "hashedPasswordBaru"
    }
}
```

**Response Success (200):**
```json
{
    "success": true,
    "message": "Password berhasil diubah"
}
```

**Response Error (400/401):**
```json
{
    "success": false,
    "error": "Token tidak valid"
}
```
atau
```json
{
    "success": false,
    "error": "Token sudah kadaluarsa"
}
```

## Langkah-langkah Testing di Postman

### Testing Logout:

1. Login terlebih dahulu untuk mendapatkan token JWT
2. Buat request baru di Postman:
   - Method: POST
   - URL: {{base_url}}/api/logout
   - Headers: 
     - Authorization: Bearer {token_dari_login}
     - Content-Type: application/json
3. Masukkan email yang sesuai dengan token di request body
4. Send request
5. Verifikasi response:
   - Status code harus 200 jika berhasil
   - Cookie token harus dihapus
   - Coba akses endpoint protected untuk memastikan token sudah tidak valid

### Testing Forgot Password:

1. Buat request baru di Postman:
   - Method: POST
   - URL: {{base_url}}/api/forgot-password
   - Headers: Content-Type: application/json
2. Masukkan email yang terdaftar di request body
3. Send request
4. Verifikasi response:
   - Status code harus 200 jika berhasil
   - Cek email untuk mendapatkan token reset password

### Testing Reset Password:

1. Buat request baru di Postman:
   - Method: POST
   - URL: {{base_url}}/api/reset-password
   - Headers: Content-Type: application/json
2. Masukkan token dari email dan password baru di request body
3. Send request
4. Verifikasi response:
   - Status code harus 200 jika berhasil
5. Test login dengan password baru untuk memastikan perubahan berhasil

## Tips Testing

1. **Urutan Testing yang Disarankan:**
   - Test forgot password dengan email valid
   - Test forgot password dengan email tidak terdaftar
   - Test reset password dengan token valid
   - Test reset password dengan token expired
   - Test login setelah reset password
   - Test logout dengan token valid
   - Test logout dengan sesi check-in aktif
   - Test akses endpoint protected setelah logout

2. **Environment Variables:**
   Buat environment variables di Postman:
   ```
   base_url: URL API (contoh: http://localhost:8888)
   token: Token JWT dari login
   ```

3. **Collection Variables:**
   Simpan email dan password test di collection variables untuk memudahkan testing:
   ```
   test_email: email untuk testing
   test_password: password untuk testing
   ```

4. **Automasi Testing:**
   Gunakan Postman Tests script untuk automasi verifikasi response:
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });

   pm.test("Response success is true", function () {
       var jsonData = pm.response.json();
       pm.expect(jsonData.success).to.be.true;
   });
