# Panduan Testing Endpoint Authentication

## 1. Login
```
POST {{base_url}}/api/login
```

### Test Case 1: Login Berhasil
Request:
```json
{
  "data": {
    "email": "frankykolondam@gmail.com",
    "hashedPassword": "hashed_password_here"
  }
}
```
Expected Response (200):
```json
{
  "success": true,
  "data": {
    "email": "frankykolondam@gmail.com",
    "fullName": "Franky",
    "role": "Driver",
    "branch": "RDA MANADO",
    "token": "jwt_token_here"
  }
}
```

### Test Case 2: Email Tidak Terdaftar
Request:
```json
{
  "data": {
    "email": "tidakada@gmail.com",
    "hashedPassword": "any_password"
  }
}
```
Expected Response (400):
```json
{
  "success": false,
  "message": "Email atau password salah"
}
```

### Test Case 3: Password Salah
Request:
```json
{
  "data": {
    "email": "frankykolondam@gmail.com",
    "hashedPassword": "wrong_password"
  }
}
```
Expected Response (400):
```json
{
  "success": false,
  "message": "Email atau password salah"
}
```

### Test Case 4: Akun Belum Diaktivasi
Request:
```json
{
  "data": {
    "email": "unactivated@gmail.com",
    "hashedPassword": "correct_password"
  }
}
```
Expected Response (400):
```json
{
  "success": false,
  "message": "Akun belum diaktivasi"
}
```

### Test Case 5: Data Tidak Lengkap
Request:
```json
{
  "data": {
    "email": "frankykolondam@gmail.com"
  }
}
```
Expected Response (400):
```json
{
  "success": false,
  "message": "Data tidak lengkap"
}
```

## 2. Register
```
POST {{base_url}}/api/register
```

### Test Case 1: Registrasi Berhasil
Request:
```json
{
  "data": {
    "email": "newuser@gmail.com",
    "hashedPassword": "hashed_password_here",
    "fullName": "New User",
    "role": "Driver",
    "branch": "RDA MANADO",
    "activationToken": "generated_token_here"
  }
}
```
Expected Response (200):
```json
{
  "success": true,
  "message": "Registrasi berhasil. Silakan cek email untuk aktivasi akun."
}
```

### Test Case 2: Email Sudah Terdaftar
Request:
```json
{
  "data": {
    "email": "frankykolondam@gmail.com",
    "hashedPassword": "hashed_password_here",
    "fullName": "Duplicate User",
    "role": "Driver",
    "branch": "RDA MANADO",
    "activationToken": "generated_token_here"
  }
}
```
Expected Response (400):
```json
{
  "success": false,
  "message": "Email sudah terdaftar"
}
```

### Test Case 3: Data Tidak Lengkap
Request:
```json
{
  "data": {
    "email": "newuser@gmail.com",
    "hashedPassword": "hashed_password_here"
  }
}
```
Expected Response (400):
```json
{
  "success": false,
  "message": "Data tidak lengkap"
}
```

### Test Case 4: Role Tidak Valid
Request:
```json
{
  "data": {
    "email": "newuser@gmail.com",
    "hashedPassword": "hashed_password_here",
    "fullName": "New User",
    "role": "InvalidRole",
    "branch": "RDA MANADO",
    "activationToken": "generated_token_here"
  }
}
```
Expected Response (400):
```json
{
  "success": false,
  "message": "Role tidak valid"
}
```

### Test Case 5: Branch Tidak Valid
Request:
```json
{
  "data": {
    "email": "newuser@gmail.com",
    "hashedPassword": "hashed_password_here",
    "fullName": "New User",
    "role": "Driver",
    "branch": "INVALID BRANCH",
    "activationToken": "generated_token_here"
  }
}
```
Expected Response (400):
```json
{
  "success": false,
  "message": "Branch tidak valid"
}
```

## 3. Aktivasi Akun
```
GET {{base_url}}/api/activate?token={activation_token}
```

### Test Case 1: Aktivasi Berhasil
Request:
```
GET {{base_url}}/api/activate?token=valid_token_here
```
Expected Response (200):
```text
Akun berhasil diaktivasi. Silakan login.
```

### Test Case 2: Token Tidak Valid
Request:
```
GET {{base_url}}/api/activate?token=invalid_token
```
Expected Response (400):
```text
Token aktivasi tidak valid
```

### Test Case 3: Token Expired
Request:
```
GET {{base_url}}/api/activate?token=expired_token
```
Expected Response (400):
```text
Token aktivasi sudah kadaluarsa
```

## Langkah-langkah Testing di Postman

1. Setup Environment Variables:
   - `base_url`: http://localhost:8888
   - `token`: (akan diisi setelah login berhasil)

2. Buat Collection untuk Auth Tests:
   - Login Tests (semua test case)
   - Register Tests (semua test case)
   - Activation Tests (semua test case)

3. Untuk setiap request:
   - Set method (POST/GET)
   - Set URL dengan environment variable
   - Set headers:
     ```
     Content-Type: application/json
     ```
   - Set body sesuai test case (untuk POST)
   - Add Tests script untuk validasi response

4. Contoh Tests Script untuk Login:
```javascript
pm.test("Response status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has correct structure", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData).to.have.property('data');
});

if (pm.response.code === 200) {
    pm.test("Success response has required user data", function () {
        const jsonData = pm.response.json();
        pm.expect(jsonData.data).to.have.property('email');
        pm.expect(jsonData.data).to.have.property('fullName');
        pm.expect(jsonData.data).to.have.property('role');
        pm.expect(jsonData.data).to.have.property('branch');
        pm.expect(jsonData.data).to.have.property('token');
    });

    // Save token if login successful
    pm.test("Save token to environment", function () {
        const jsonData = pm.response.json();
        pm.environment.set("token", jsonData.data.token);
    });
} else {
    pm.test("Error response has message", function () {
        const jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('message');
    });
}
```

5. Urutan Testing:
   1. Test Register dengan berbagai skenario
   2. Test Aktivasi dengan token yang valid
   3. Test Login dengan akun yang sudah diaktivasi
   4. Verifikasi token tersimpan di environment
   5. Test endpoint lain yang membutuhkan autentikasi

## Catatan Penting:
1. Password harus di-hash di client sebelum dikirim
2. Token aktivasi harus di-generate di client
3. Simpan token di environment variable setelah login berhasil
4. Gunakan token untuk request ke protected endpoints
5. Validasi format email sebelum request
6. Pastikan password memenuhi kriteria keamanan
