# Test Steps untuk Ranged Invoice dengan Cache

## Test 1: Request Invoice dengan Range
```http
GET http://localhost:8888/api/invoices?branch=RDA%20MANADO&date=2024-01-27&ranged=true
```
Expected Response:
```json
{
  "success": true,
  "data": {
    "invoices": [...],
    "total": number,
    "branch": "RDA MANADO",
    "dateRange": {
      "start": "1/21/2024",
      "end": "1/27/2024"
    },
    "metadata": {
      "processedRows": number,
      "matchingBranch": number,
      "inDateRange": number,
      "executionTime": number
    }
  }
}
```

## Test 2: Cek Cache Stats
```http
GET http://localhost:8888/api/cache?action=stats
```
Expected Response:
```json
{
  "success": true,
  "data": {
    "keys": 1,
    "hits": 0,
    "misses": 1,
    "ksize": number,
    "vsize": number
  }
}
```

## Test 3: Request Invoice Lagi (Should Hit Cache)
```http
GET http://localhost:8888/api/invoices?branch=RDA%20MANADO&date=2024-01-27&ranged=true
```
Expected:
- Response sama dengan Test 1
- Response time lebih cepat
- Cache stats menunjukkan hit bertambah

## Test 4: Clear Cache (Optional)
```http
GET http://localhost:8888/api/cache?action=clear&pattern=invoice_RDA%20MANADO
```
Expected Response:
```json
{
  "success": true,
  "message": "Cleared X cache entries matching pattern: invoice_RDA MANADO"
}
```

Mohon dicoba satu per satu dan share hasilnya untuk verifikasi.
