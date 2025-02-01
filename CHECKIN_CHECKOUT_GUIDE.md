# Panduan Endpoint Check-in dan Check-out dengan File Upload

## 1. Check-in
```http
POST /api/checkin
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Body
```json
{
  "data": {
    "username": "frankykolondam@gmail.com",
    "branch": "RDA MANADO",
    "vehicleNumber": "DB 1234 XX",
    "checkInTime": "2024-01-27T09:00:00Z",
    "initialOdometer": 12345,
    "checkInPhoto": "base64_string_here",
    "location": {
      "latitude": -1.4613422,
      "longitude": 124.8271213
    }
  }
}
```

### Response Success (200)
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Check-in berhasil",
  "data": {
    "checkInPhotoUrl": "https://drive.google.com/file/d/xxx/view"
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "error": "Foto odometer diperlukan"
}
```

## 2. Check-out
```http
POST /api/checkout
```

### Headers
```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Body
```json
{
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "checkOutTime": "2024-01-27T17:00:00Z",
    "finalOdometer": 12445,
    "checkOutPhoto": "base64_string_here",
    "location": {
      "latitude": -1.4613422,
      "longitude": 124.8271213
    }
  }
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Check-out berhasil",
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "distanceTraveled": 100,
    "checkOutPhotoUrl": "https://drive.google.com/file/d/xxx/view"
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "error": "Foto odometer diperlukan"
}
```

## Panduan File Upload

### Format Base64
1. File harus dikonversi ke base64 string
2. Prefix data URL (optional):
   ```
   data:image/jpeg;base64,
   ```
3. Maximum file size: 5MB
4. Format yang didukung: JPG, JPEG, PNG

### Contoh Konversi di JavaScript
```javascript
function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Usage
const file = event.target.files[0];
const base64 = await getBase64(file);
```

## Test Cases

### Check-in
1. Data Lengkap dengan Foto
```javascript
pm.test("Check-in with photo successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.have.property('checkInPhotoUrl');
    pm.expect(jsonData.data.checkInPhotoUrl).to.include('drive.google.com');
});
```

2. Tanpa Foto
```javascript
pm.test("Check-in without photo fails", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.false;
    pm.expect(jsonData.error).to.include('Foto odometer diperlukan');
});
```

3. Foto Invalid
```javascript
pm.test("Check-in with invalid photo fails", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.false;
    pm.expect(jsonData.error).to.include('Invalid file format');
});
```

### Check-out
1. Data Lengkap dengan Foto
```javascript
pm.test("Check-out with photo successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.have.property('checkOutPhotoUrl');
    pm.expect(jsonData.data.checkOutPhotoUrl).to.include('drive.google.com');
});
```

2. Tanpa Foto
```javascript
pm.test("Check-out without photo fails", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.false;
    pm.expect(jsonData.error).to.include('Foto odometer diperlukan');
});
```

3. Foto Invalid
```javascript
pm.test("Check-out with invalid photo fails", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.false;
    pm.expect(jsonData.error).to.include('Invalid file format');
});
```

## Tips
1. Compress foto sebelum konversi ke base64
2. Validasi file size sebelum upload
3. Handle error upload dengan retry
4. Monitor response time untuk file upload
5. Cek URL foto setelah upload

## Error Cases yang Perlu Dihandle
1. File terlalu besar
2. Format file tidak valid
3. Base64 string corrupt
4. Upload gagal ke Google Drive
5. URL foto tidak valid

## Monitoring
1. Upload success rate
2. Average upload time
3. File size distribution
4. Error rate per type
5. Storage usage
