# Panduan Endpoint Invoice dengan Range dan Caching

## 1. Endpoint Baru
```
GET /api/invoices?branch={branch}&date={date}&ranged=true
```

### Parameters
- branch (required): Kode cabang
- date (required): Tanggal akhir range (format: YYYY-MM-DD)
- ranged (optional): Set 'true' untuk mendapatkan data 7 hari

### Response
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "branchName": "string",
        "tanggalLengkap": "M/D/YYYY",
        "nomorInvoice": "string",
        "namaCustomer": "string",
        "prinsipal": "string"
      }
    ],
    "total": "number",
    "branch": "string",
    "dateRange": {
      "start": "M/D/YYYY",
      "end": "M/D/YYYY"
    },
    "metadata": {
      "processedRows": "number",
      "matchingBranch": "number",
      "inDateRange": "number",
      "executionTime": "number"
    }
  }
}
```

## 2. Cache Management

### Cache Stats
```
GET /api/cache?action=stats
```
Response:
```json
{
  "success": true,
  "data": {
    "keys": "number",
    "hits": "number",
    "misses": "number",
    "ksize": "number",
    "vsize": "number"
  }
}
```

### Clear Cache
```
GET /api/cache?action=clear&pattern=invoice_RDA%20MANADO
```
Response:
```json
{
  "success": true,
  "message": "Cleared X cache entries matching pattern: pattern"
}
```

## 3. Implementasi Detail

### Cache Configuration
- TTL: 1 jam (3600 detik)
- Check Period: 10 menit (600 detik)
- Key Format: `invoice_{branch}_{date}`

### Date Range
- Start Date: 7 hari sebelum tanggal yang diminta
- End Date: Tanggal yang diminta
- Format Internal: M/D/YYYY
- Format API Request: YYYY-MM-DD

## 4. Testing Guide

### 1. Test Range Invoice
```http
GET {{base_url}}/api/invoices?branch=RDA%20MANADO&date=2024-01-27&ranged=true
```
Expected:
- Data invoice 7 hari terakhir
- Metadata eksekusi
- Response time pertama > 10s
- Response time kedua < 1s (cached)

### 2. Test Cache Stats
```http
GET {{base_url}}/api/cache?action=stats
```
Verifikasi:
- Jumlah keys
- Hit ratio
- Memory usage

### 3. Test Cache Clear
```http
GET {{base_url}}/api/cache?action=clear&pattern=invoice_RDA%20MANADO
```
Verifikasi:
- Cache terhapus
- Next request fetch ulang

## 5. Performance Monitoring

### Metrics yang Dimonitor
1. Execution Time:
   - Query time
   - Processing time
   - Total execution time

2. Data Stats:
   - Total rows processed
   - Matching branch count
   - In date range count

3. Cache Stats:
   - Cache hits/misses
   - Memory usage
   - Key count

### Log Format
```javascript
{
  timestamp: "ISO string",
  action: "getRangedInvoiceList",
  branch: "string",
  dateRange: {
    start: "string",
    end: "string"
  },
  stats: {
    processedRows: "number",
    matchingBranch: "number",
    inDateRange: "number",
    executionTime: "number"
  }
}
```

## 6. Best Practices

1. Cache Management:
   - Clear cache saat ada perubahan data
   - Monitor memory usage
   - Adjust TTL sesuai kebutuhan

2. Error Handling:
   - Validate input parameters
   - Handle timeout gracefully
   - Provide detailed error messages

3. Performance:
   - Use early exit dalam loop
   - Minimize data transformation
   - Log execution metrics

4. Maintenance:
   - Monitor cache stats regular
   - Clear cache jika diperlukan
   - Review execution logs
