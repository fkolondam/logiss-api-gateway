# API Documentation

## Base URL
`/api`

## Authentication
Most endpoints require authentication using JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Protected Routes
The following routes require authentication and branch validation:
- /checkin
- /checkout
- /delivery
- /expenses
- /available-invoices
- /invoices
- /invoice

For these routes, the token's branch must match the requested branch.

## Error Responses
All endpoints may return the following error responses:

```json
{
  "success": false,
  "error": "Error message",
  "stack": "Error stack trace (development only)"
}
```

Common HTTP Status Codes:
- 200: Success
- 204: No Content (for OPTIONS requests)
- 400: Bad Request (validation errors, business logic errors)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (branch mismatch)
- 404: Not Found (resource not found)
- 405: Method Not Allowed
- 500: Internal Server Error

## Endpoints

### Authentication

#### Register
```http
POST /api/register
```
Register a new user account.

**Request Body:**
```json
{
  "data": {
    "email": "string (required)",
    "hashedPassword": "string (required)",
    "fullName": "string (required)"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful",
    "activationLink": "string"
  }
}
```

**Error Cases:**
- Missing required fields
- Email already registered
- Invalid email format

#### Login
```http
POST /api/login
```
Login to get authentication token.

**Request Body:**
```json
{
  "data": {
    "email": "string (required)",
    "hashedPassword": "string (required)"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "email": "string",
    "fullName": "string",
    "role": "string",
    "branch": "string",
    "token": "JWT token string"
  }
}
```

**Error Cases:**
- Missing credentials
- Invalid credentials
- Account not activated
- Account locked

#### Logout
```http
POST /api/logout
```
Logout and invalidate current token.

**Request Body:**
```json
{
  "data": {
    "email": "string (required)"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logout successful"
  }
}
```

**Error Cases:**
- Token not found
- Invalid token
- Email mismatch with token

#### Activate Account
```http
GET /api/activate?token=<activation_token>
```
Activate a newly registered account.

**Success Response:**
```json
{
  "success": true,
  "data": {
    "message": "Account activated successfully"
  }
}
```

**Error Cases:**
- Missing token
- Invalid token
- Token expired
- Account already activated

#### Forgot Password
```http
POST /api/forgot-password
```
Request password reset link.

**Request Body:**
```json
{
  "data": {
    "email": "string (required)"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset instructions sent",
    "resetLink": "string"
  }
}
```

**Error Cases:**
- Missing email
- Email not found
- Account not activated

#### Reset Password
```http
POST /api/reset-password
```
Reset password using reset token.

**Request Body:**
```json
{
  "data": {
    "token": "string (required)",
    "newPassword": "string (required)"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

**Error Cases:**
- Missing token or password
- Invalid token
- Token expired

### Vehicle Operations

#### Check-in
```http
POST /api/checkin
```
Check-in a vehicle at start of day/shift.

**Request Body:**
```json
{
  "data": {
    "branch": "string (required)",
    "vehicleNumber": "string (required)",
    "checkInTime": "ISO8601 datetime (required)",
    "initialOdometer": "number (required, positive)",
    "checkInPhoto": "base64 image string (required)",
    "location": {
      "latitude": "number (required)",
      "longitude": "number (required)"
    }
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "message": "Check-in successful",
    "checkInTime": "ISO8601 datetime",
    "vehicleNumber": "string"
  }
}
```

**Error Cases:**
- Missing required fields
- Invalid odometer value (must be positive number)
- Invalid check-in time
- Invalid photo format
- Invalid location format
- Vehicle already checked in
- Location too far from branch
- Branch mismatch with token

#### Check-out
```http
POST /api/checkout
```
Check-out a vehicle at end of day/shift.

**Request Body:**
```json
{
  "data": {
    "sessionId": "string (required)",
    "checkOutTime": "ISO8601 datetime (required)",
    "finalOdometer": "number (required, > initial odometer)",
    "checkOutPhoto": "base64 image string (required)",
    "location": {
      "latitude": "number (required)",
      "longitude": "number (required)"
    }
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "message": "Check-out successful",
    "checkOutTime": "ISO8601 datetime",
    "totalDistance": "number"
  }
}
```

**Error Cases:**
- Missing required fields
- Invalid odometer value
- Invalid check-out time
- Invalid photo format
- Invalid location format
- Session not found (404)
- Session already completed
- Final odometer less than initial
- Location too far from branch

### Delivery Management

#### Get Deliveries
```http
GET /api/delivery?branch=<branch>&range=<range>
```
Get all deliveries for a branch.

**Query Parameters:**
- branch (required): Branch code
- range (optional): Date range for filtering

**Success Response:**
```json
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "id": "string",
        "branch": "string",
        "helperName": "string",
        "vehicleNumber": "string",
        "deliveryTime": "ISO8601 datetime",
        "storeName": "string",
        "storeAddress": "string",
        "invoiceNumber": "string",
        "invoiceAmount": "number",
        "paymentType": "string",
        "status": "string",
        "location": {
          "latitude": "number",
          "longitude": "number"
        }
      }
    ],
    "total": "number",
    "page": "number",
    "pageSize": "number"
  }
}
```

#### Get Delivery by ID
```http
GET /api/delivery?id=<delivery_id>
```
Get specific delivery details.

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "branch": "string",
    "helperName": "string",
    "vehicleNumber": "string",
    "deliveryTime": "ISO8601 datetime",
    "storeName": "string",
    "storeAddress": "string",
    "invoiceNumber": "string",
    "invoiceAmount": "number",
    "paymentType": "string",
    "status": "string",
    "deliveryCheckinPhoto": "string (URL)",
    "deliveryPhoto": "string (URL)",
    "paymentPhoto": "string (URL)",
    "location": {
      "latitude": "number",
      "longitude": "number"
    }
  }
}
```

#### Get Deliveries by Context
```http
GET /api/delivery?context=<context>&branch=<branch>&range=<range>
```
Get deliveries filtered by context.

**Query Parameters:**
- context (required): Filter context
- branch (required): Branch code
- range (optional): Date range

#### Submit Delivery
```http
POST /api/delivery
```
Submit a new delivery record.

**Request Body:**
```json
{
  "data": {
    "branch": "string (required)",
    "helperName": "string (required)",
    "vehicleNumber": "string (required)",
    "deliveryTime": "ISO8601 datetime (required)",
    "storeName": "string (required)",
    "storeAddress": "string (required)",
    "invoiceNumber": "string (required)",
    "invoiceAmount": "number (required, positive)",
    "paymentType": "enum (TUNAI|TRANSFER|CEK/GIRO|TANDA TERIMA FAKTUR) (required)",
    "deliveryCheckinPhoto": "base64 image string (required)",
    "deliveryPhoto": "base64 image string (optional)",
    "paymentPhoto": "base64 image string (optional)",
    "location": {
      "latitude": "number (required)",
      "longitude": "number (required)"
    }
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "message": "Delivery submitted successfully",
    "deliveryTime": "ISO8601 datetime"
  }
}
```

**Error Cases:**
- Missing required fields
- Invalid delivery time
- Invalid invoice amount (must be positive)
- Invalid payment type
- Invalid photo format
- Invalid location format
- Branch mismatch with token
- Invoice already delivered
- Location too far from store

### Expenses Management

#### Get Expenses
```http
GET /api/expenses?branch=<branch>&category=<category>&range=<range>
```
Get expenses for a branch.

**Query Parameters:**
- branch (required): Branch code
- category (optional): Expense category
- range (optional): Date range

**Success Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "string",
        "date": "YYYY-MM-DD",
        "branch": "string",
        "licensePlate": "string",
        "category": "string",
        "subcategory": "string",
        "amount": "number",
        "receiptPhoto": "string (URL)"
      }
    ],
    "total": "number",
    "totalAmount": "number"
  }
}
```

#### Get Expenses by Context
```http
GET /api/expenses?context=<context>&range=<range>
```
Get expenses filtered by context.

#### Submit Expense
```http
POST /api/expenses
```
Submit a new expense record.

**Request Body:**
```json
{
  "data": {
    "date": "YYYY-MM-DD (required)",
    "branch": "string (required)",
    "licensePlate": "string (required)",
    "category": "string (required)",
    "subcategory": "string (required)",
    "amount": "number (required, positive)",
    "receiptPhoto": "base64 image string (optional)"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "message": "Expense recorded successfully"
  }
}
```

**Error Cases:**
- Missing required fields
- Invalid date format
- Invalid amount (must be positive)
- Invalid photo format
- Branch mismatch with token

### Invoice Management

#### Get Available Invoices
```http
GET /api/available-invoices?branch=<branch>&date=<YYYY-MM-DD>&range=<range>
```
Get list of available invoices.

**Query Parameters:**
- branch (required): Branch code
- date (required): Date in YYYY-MM-DD format
- range (optional): Date range

**Success Response:**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "invoiceNumber": "string",
        "customerName": "string",
        "amount": "number",
        "status": "string",
        "dueDate": "YYYY-MM-DD"
      }
    ],
    "total": "number",
    "totalAmount": "number"
  }
}
```

#### Get Invoices
```http
GET /api/invoices?branch=<branch>&date=<YYYY-MM-DD>&ranged=<boolean>
```
Get invoices for a branch.

**Query Parameters:**
- branch (required): Branch code
- date (required): Date in YYYY-MM-DD format
- ranged (optional): Boolean to include date range

#### Get Invoice Details
```http
GET /api/invoice?invoiceNo=<invoice_number>
```
Get specific invoice details.

**Success Response:**
```json
{
  "success": true,
  "data": {
    "invoiceNumber": "string",
    "customerName": "string",
    "customerAddress": "string",
    "amount": "number",
    "status": "string",
    "issueDate": "YYYY-MM-DD",
    "dueDate": "YYYY-MM-DD",
    "items": [
      {
        "productCode": "string",
        "description": "string",
        "quantity": "number",
        "unitPrice": "number",
        "total": "number"
      }
    ],
    "branchName": "string"
  }
}
```

### Reference Data

#### Get Branches
```http
GET /api/branches
```
Get list of all branches.

**Success Response:**
```json
{
  "success": true,
  "data": {
    "branches": [
      {
        "code": "string",
        "name": "string",
        "address": "string",
        "location": {
          "latitude": "number",
          "longitude": "number"
        }
      }
    ]
  }
}
```

#### Get Vehicles
```http
GET /api/vehicles?branch=<branch>
```
Get list of vehicles for a branch.

**Query Parameters:**
- branch (required): Branch code

**Success Response:**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "licensePlate": "string",
        "type": "string",
        "status": "string",
        "branch": "string"
      }
    ]
  }
}
```

### Cache Management

#### Get Cache Stats
```http
GET /api/cache?action=stats
```
Get cache statistics.

**Success Response:**
```json
{
  "success": true,
  "data": {
    "hits": "number",
    "misses": "number",
    "keys": "number",
    "ksize": "number",
    "vsize": "number"
  }
}
```

## Technical Details

### File Upload Guidelines
- Images must be provided as base64 strings with data URL format
- Format: `data:image/jpeg;base64,...` or `data:image/png;base64,...`
- Supported image formats: JPEG, PNG
- Base64 data must be valid and complete
- Maximum file size: 5MB

### Location Data Format
Location data must be provided in the following format:
```json
{
  "latitude": "number (required, -90 to 90)",
  "longitude": "number (required, -180 to 180)"
}
```

### Date and Time Format
- Dates must be provided in `YYYY-MM-DD` format
- Timestamps must be provided in ISO8601 format
- All times are in Asia/Jakarta timezone (UTC+7)
- Date ranges can be specified as:
  - today
  - yesterday
  - thisWeek
  - lastWeek
  - thisMonth
  - lastMonth
  - custom (requires start and end dates)

### Rate Limiting
The API implements rate limiting with the following defaults:
- Window: 15 minutes (900,000 ms)
- Max requests per window: 100
- Rate limit headers included in response:
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  - X-RateLimit-Reset

### Caching
The API implements caching with environment-specific TTLs:
- Development: 30 minutes (1800 seconds)
- Staging: 1 hour (3600 seconds)
- Production: 2 hours (7200 seconds)

Cached endpoints:
- /branches
- /vehicles
- /available-invoices
- /invoices
- /delivery (GET requests)
- /expenses (GET requests)

### Security
- All endpoints use HTTPS
- JWT tokens expire after 24 hours
- Passwords must be hashed before sending
- CORS enabled for specified origins
- Branch-level access control
- Request/Response logging (configurable per environment)
- Input validation and sanitization
- Rate limiting per IP
