# Vicatomaps API Specification

This document defines the full REST API for the Vicatomaps backend.  
All endpoints follow a consistent JSON structure and are grouped into:

- Authentication API
- Routes & Cost Calculation API
- Vehicles API
- Fuel Prices API
- Trips API
- Admin API
- Health API

Authentication uses **Firebase ID tokens** (Bearer header).  
Most endpoints are stateless and return JSON responses.

---

# 1. Authentication API

Base path: `/api/auth`

## 1.1 POST /api/auth/register
Registers or updates a user based on Firebase UID.

**Headers**
```

Authorization: Bearer <firebase_id_token>

````

**Response**
```json
{
  "success": true,
  "user": { ... },
  "isNewUser": false
}
````

---

## 1.2 GET /api/auth/me

Returns authenticated user profile.

**Headers**

```
Authorization: Bearer <firebase_id_token>
```

**Response**

```json
{
  "success": true,
  "user": { ... }
}
```

---

## 1.3 PUT /api/auth/profile

Updates profile fields.

**Body**

```json
{
  "displayName": "Anna",
  "preferences": {
    "language": "en",
    "darkMode": true,
    "defaultVehicleId": "6635...",
    "measurementSystem": "metric"
  }
}
```

---

## 1.4 DELETE /api/auth/account

Deletes MongoDB user record.

---

## 1.5 POST /api/auth/logout

Client-side logout (token discarded).

---

# 2. Routes & Cost Calculation API

Base path: `/api/routes`

Used for navigation, fuel/toll cost calculation, alternative route comparison.

---

## 2.1 POST /api/routes/calculate

Main endpoint: calculates route, fuel cost, toll cost, total cost.

**Headers**

```
Authorization: Bearer <token>   (optional)
```

Supports guest mode via `optionalAuth`.

**Body**

```json
{
  "origin": { "lat": 54.6872, "lon": 25.2797 },
  "destination": { "lat": 52.52, "lon": 13.405 },
  "vehicleId": "6635...",
  "waypoints": [
    { "lat": 53.0, "lon": 24.0 }
  ]
}
```

**Response**

```json
{
  "success": true,
  "route": { ... },
  "fuelCost": { "total": 42.3, "breakdown": [...] },
  "tollCost": { "total": 12.5, "breakdown": [...] },
  "totalCost": 54.8,
  "routes": [ ... ],
  "countries": ["LT","PL","DE"],
  "savedToHistory": true,
  "tripId": "6791..."
}
```

---

## 2.2 POST /api/routes/import-google

Imports a Google Maps URL, parses it, computes route + costs.

**Body**

```json
{
  "googleMapsUrl": "https://maps.app.goo.gl/...",
  "vehicleId": "6635..."
}
```

---

## 2.3 GET /api/routes/history

Returns trip history (auth required).

**Query parameters**

| Name  | Default | Description      |
| ----- | ------- | ---------------- |
| limit | 20      | Pagination limit |
| skip  | 0       | Offset           |

---

## 2.4 GET /api/routes/history/:tripId

Returns selected trip by ID.

---

## 2.5 DELETE /api/routes/history/:tripId

Deletes a trip belonging to the authenticated user.

---

# 3. Vehicles API

Base path: `/api/vehicles`

---

## 3.1 GET /api/vehicles/

Returns all predefined vehicles.

**Response**

```json
{
  "vehicles": [
    {
      "_id": "6635...",
      "name": "Petrol Compact",
      "fuelType": "petrol",
      "consumption": 6.5
    }
  ]
}
```

---

## 3.2 GET /api/vehicles/:id

Returns selected vehicle.

---

## 3.3 POST /api/vehicles/

Creates a new vehicle (primarily internal use).

---

## 3.4 PUT /api/vehicles/:id

Updates vehicle parameters.

---

# 4. Fuel Prices API

Base path: `/api/fuel-prices`

---

## 4.1 GET /api/fuel-prices/

Returns all fuel prices stored in MongoDB.

**Example**

```json
{
  "fuelPrices": [
    {
      "countryCode": "DEU",
      "country": "Germany",
      "gasoline": 1.76,
      "diesel": 1.63,
      "lpg": 0.89
    }
  ]
}
```

---

# 5. Trips API

Base path: `/api/trips`

Used mostly for debugging and admin dashboards.

---

## 5.1 GET /api/trips

Returns all stored trips.

---

## 5.2 GET /api/trips/:id

Returns specific trip.

---

## 5.3 POST /api/trips

Creates a new trip document manually.

---

## 5.4 DELETE /api/trips/:id

Deletes a trip record.

---

# 6. Admin API

Base path: `/api/admin`

Used for fuel price updates.

---

## 6.1 GET /api/admin/fuel/update

Triggers the full fuel price scraping pipeline.

Response:

```json
{
  "success": true,
  "totalCountries": 31
}
```

---

## 6.2 POST /api/admin/fuel/update

Same functionality, POST-friendly for tools.

---

## 6.3 GET /api/admin/fuel/status

Returns last update timestamp.

---

# 7. Health API

## GET /api/health

Reports backend and database status.

**Response**

```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected",
  "mongodb": {
    "state": 1,
    "name": "vicatomaps"
  }
}
```

---

# 8. Error Response Format

All error responses follow a unified structure:

```json
{
  "error": {
    "message": "Human-readable message",
    "status": 400
  }
}
```

Common status codes:

* `400` — invalid input
* `401` — missing/invalid token
* `404` — not found
* `500` — server error

---

# 9. Authentication Rules Summary

| Endpoint                | Auth                           | Notes                     |
| ----------------------- | ------------------------------ | ------------------------- |
| `/api/routes/calculate` | Optional                       | Guest mode allowed        |
| `/api/routes/history`   | Required                       | User trips only           |
| `/api/vehicles`         | Public                         | No auth required          |
| `/api/fuel-prices`      | Public                         | No auth required          |
| `/api/admin/**`         | Public (but intended internal) | Should be protected later |
| `/api/auth/**`          | Required except `/register`    | Uses Firebase ID tokens   |

---
