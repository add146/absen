# 📡 API Reference

## Base URL

```
Production: https://absen-api.<account>.workers.dev
Development: http://localhost:8787
```

## Authentication

Semua endpoint (kecuali auth) memerlukan JWT token di header:

```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /auth/register
Registrasi user baru.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "phone": "08123456789",
  "tenant_id": "tenant-uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### POST /auth/login
Login user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "employee",
      "points_balance": 1250
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG..."
  }
}
```

---

## Attendance Endpoints

### POST /attendance/check-in
Check-in kehadiran dengan validasi GPS.

**Request Body:**
```json
{
  "latitude": -6.2088,
  "longitude": 106.8456,
  "location_id": "location-uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "attendance_id": "attendance-uuid",
    "check_in_time": "2026-02-03T08:00:00Z",
    "location_name": "Kantor Pusat",
    "points_earned": 10,
    "is_on_time": true
  }
}
```

**Error Responses:**
- `400` - Koordinat tidak valid
- `403` - Di luar area geofence
- `409` - Sudah check-in hari ini

---

### POST /attendance/check-out
Check-out kehadiran.

**Request Body:**
```json
{
  "attendance_id": "attendance-uuid",
  "latitude": -6.2088,
  "longitude": 106.8456
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "attendance_id": "attendance-uuid",
    "check_out_time": "2026-02-03T17:00:00Z",
    "duration_hours": 9,
    "bonus_points": 5
  }
}
```

---

### GET /attendance/history
Riwayat kehadiran user.

**Query Parameters:**
- `start_date` (optional): Format YYYY-MM-DD
- `end_date` (optional): Format YYYY-MM-DD
- `page` (optional): Default 1
- `limit` (optional): Default 20, max 100

**Response (200):**
```json
{
  "success": true,
  "data": {
    "attendances": [
      {
        "id": "attendance-uuid",
        "check_in_time": "2026-02-03T08:00:00Z",
        "check_out_time": "2026-02-03T17:00:00Z",
        "location_name": "Kantor Pusat",
        "points_earned": 15,
        "is_valid": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

---

### GET /attendance/today
Status kehadiran hari ini.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "has_checked_in": true,
    "has_checked_out": false,
    "attendance": {
      "id": "attendance-uuid",
      "check_in_time": "2026-02-03T08:00:00Z",
      "location_name": "Kantor Pusat"
    }
  }
}
```

---

## Points Endpoints

### GET /points/balance
Saldo poin user saat ini.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": 1250,
    "earned_this_month": 180,
    "redeemed_this_month": 50
  }
}
```

---

### GET /points/history
Riwayat transaksi poin.

**Query Parameters:**
- `type` (optional): `earn`, `redeem`, `adjust`
- `page` (optional): Default 1
- `limit` (optional): Default 20

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "ledger-uuid",
        "transaction_type": "earn",
        "amount": 10,
        "description": "Check-in tepat waktu",
        "balance_after": 1250,
        "created_at": "2026-02-03T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120
    }
  }
}
```

---

### POST /points/redeem
Tukar poin untuk voucher/diskon.

**Request Body:**
```json
{
  "discount_rule_id": "rule-uuid",
  "amount": 100
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "voucher_code": "DISC-ABC123",
    "discount_value": 10000,
    "points_used": 100,
    "balance_after": 1150,
    "expires_at": "2026-03-03T23:59:59Z"
  }
}
```

---

## Location Endpoints (Admin)

### GET /admin/locations
Daftar lokasi/geofence.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "location-uuid",
      "name": "Kantor Pusat",
      "latitude": -6.2088,
      "longitude": 106.8456,
      "radius_meters": 100,
      "is_active": true
    }
  ]
}
```

---

### POST /admin/locations
Tambah lokasi baru.

**Request Body:**
```json
{
  "name": "Kantor Cabang",
  "latitude": -6.9175,
  "longitude": 107.6191,
  "radius_meters": 150
}
```

---

### PUT /admin/locations/:id
Update lokasi.

---

### DELETE /admin/locations/:id
Hapus lokasi.

---

## Error Response Format

Semua error mengikuti format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid coordinates",
    "details": {
      "latitude": "Must be between -90 and 90"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input tidak valid |
| `UNAUTHORIZED` | 401 | Token tidak valid/expired |
| `FORBIDDEN` | 403 | Tidak punya akses |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `CONFLICT` | 409 | Konflik data (duplicate) |
| `GEOFENCE_VIOLATION` | 403 | Di luar area |
| `FRAUD_DETECTED` | 403 | Terdeteksi kecurangan |
| `RATE_LIMITED` | 429 | Terlalu banyak request |
| `SERVER_ERROR` | 500 | Error internal server |
