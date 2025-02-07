# Authentication API Guide

## Endpoints

### 1. POST /.netlify/functions/api/logout
Endpoint untuk melakukan logout user dan menghapus sesi yang aktif.

**Headers:**
```
Authorization: Bearer {token_jwt}
Content-Type: application/json
```

**Request Body:**
```json
{
    "action": "logout",
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

### 2. POST /.netlify/functions/api/forgot-password
Endpoint untuk meminta reset password. Sistem akan mengirimkan email yang berisi token reset password.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "action": "forgotPassword",
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

### 3. POST /.netlify/functions/api/reset-password
Endpoint untuk melakukan reset password dengan token yang diterima melalui email.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "action": "resetPassword",
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

## Catatan Penting

1. **Logout:**
   - Token JWT harus disertakan di header Authorization
   - Email harus sesuai dengan email yang ada di token JWT
   - Pastikan tidak ada sesi check-in yang aktif sebelum logout
   - Setelah logout berhasil, token akan diblacklist dan cookie akan dihapus

2. **Forgot Password:**
   - Email yang dimasukkan harus email yang terdaftar
   - Link reset password akan dikirim ke email tersebut
   - Link reset password valid selama 1 jam

3. **Reset Password:**
   - Token harus valid dan belum expired
   - Password baru harus sudah di-hash dari client
   - Setelah password berhasil diubah, token reset password akan dihapus

## Testing di Postman

### Testing Logout:

1. Set environment variables di Postman:
   ```
   base_url: http://localhost:8888
   token: (token dari login)
   ```

2. Buat request baru:
   - Method: POST
   - URL: {{base_url}}/.netlify/functions/api/logout
   - Headers:
     ```
     Authorization: Bearer {{token}}
     Content-Type: application/json
     ```
   - Body:
     ```json
     {
         "action": "logout",
         "data": {
             "email": "user@example.com"
         }
     }
     ```

3. Verifikasi response:
   - Status code: 200
   - Message: "Logout berhasil"
   - Cookie token terhapus

### Testing Forgot Password:

1. Buat request baru:
   - Method: POST
   - URL: {{base_url}}/.netlify/functions/api/forgot-password
   - Headers:
     ```
     Content-Type: application/json
     ```
   - Body:
     ```json
     {
         "action": "forgotPassword",
         "data": {
             "email": "user@example.com"
         }
     }
     ```

2. Verifikasi response:
   - Status code: 200
   - Message: "Email reset password telah dikirim"
   - Cek email untuk mendapatkan link reset password

### Testing Reset Password:

1. Buat request baru:
   - Method: POST
   - URL: {{base_url}}/.netlify/functions/api/reset-password
   - Headers:
     ```
     Content-Type: application/json
     ```
   - Body:
     ```json
     {
         "action": "resetPassword",
         "data": {
             "token": "token_dari_email",
             "newPassword": "hashedPasswordBaru"
         }
     }
     ```

2. Verifikasi response:
   - Status code: 200
   - Message: "Password berhasil diubah"

3. Test login dengan password baru untuk memastikan perubahan berhasil

## Error Handling

1. Logout Errors:
   - 401: Token tidak valid atau expired
   - 400: Masih ada sesi check-in aktif
   - 404: User tidak ditemukan

2. Forgot Password Errors:
   - 400: Email tidak terdaftar
   - 500: Gagal mengirim email

3. Reset Password Errors:
   - 400: Token tidak valid
   - 400: Token sudah expired
   - 400: Password baru tidak valid
