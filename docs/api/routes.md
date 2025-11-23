# **API Routes Overview**

This document describes all public and admin API endpoints exposed by the Vicatomaps backend.
Each route is grouped by module and includes request formats, responses, validation rules, and authentication requirements.

The documentation is based strictly on the actual implementation:

* `src/routes/routes.js`
* `src/routes/vehicles.js`
* `src/routes/fuelPrices.js`
* `src/routes/admin.js`
* `src/routes/auth.js`
* `src/routes/trips.js`
* `src/routes/health.js`

---

# **1. Authentication**

*(Full details in `auth.md`)*

| Endpoint             | Method | Auth     | Description                       |
| -------------------- | ------ | -------- | --------------------------------- |
| `/api/auth/register` | POST   | Required | Register/login via Firebase token |
| `/api/auth/me`       | GET    | Required | Get authenticated user            |
| `/api/auth/profile`  | PUT    | Required | Update profile & preferences      |
| `/api/auth/account`  | DELETE | Required | Delete account                    |
| `/api/auth/logout`   | POST   | Required | Stateless logout                  |

---

# **2. Routes API (Navigation & Cost Calculation)**

Source: `src/routes/routes.js`

## **2.1 POST /api/routes/calculate**

Calculates route, fuel cost, toll cost, total cost.
Supports guest mode using `optionalAuth`.

### **Request Body**

```json
{
  "origin": { "lat": 54.7, "lon": 25.2 },
  "destination": { "lat": 52.5, "lon": 13.4 },
  "vehicleId": "65f...",
  "waypoints": [
    { "lat": 53.0, "lon": 24.0, "name": "Stop" }
  ]
}
```

### **Response**

```json
{
  "success": true,
  "route": { ... },
  "fuelCost": { "total": 42.30, "breakdown": [...] },
  "tollCost": { "total": 12.50, "breakdown": [...] },
  "totalCost": 54.80,
  "routes": [ ... ],
  "countries": ["LT","PL","DE"],
  "savedToHistory": true | false,
  "tripId": "6795..."
}
```

### **Behavior**

* Fetches routes via Google Routes API
* Detects countries from polyline
* Calculates fuel cost via fuelPriceService
* Calculates toll cost via tollService
* Saves trip if authenticated

---

## **2.2 GET /api/routes/history**

Returns trip history for authenticated user.

### Query params

| Param   | Default | Description |
| ------- | ------- | ----------- |
| `limit` | 20      | Max items   |
| `skip`  | 0       | Pagination  |

### Response

```json
{
  "success": true,
  "trips": [...],
  "pagination": {
    "total": 42,
    "limit": 20,
    "skip": 0,
    "hasMore": true
  }
}
```

---

## **2.3 GET /api/routes/history/:tripId**

Returns single trip.

---

## **2.4 DELETE /api/routes/history/:tripId**

Deletes one trip owned by the user.

---

## **2.5 POST /api/routes/import-google**

Imports route parameters from a Google Maps URL.

### Request Body

```json
{
  "googleMapsUrl": "https://maps.app.goo.gl/asdf...",
  "vehicleId": "65f..."
}
```

### Actions performed

* Parse URL
* Expand shortened URL
* Extract origin, destination, waypoints
* Geocode missing coordinates
* Calculate route and costs
* Save trip (if authenticated)

---

# **3. Vehicles API**

Source: `src/routes/vehicles.js`

| Endpoint            | Method | Auth   | Description                   |
| ------------------- | ------ | ------ | ----------------------------- |
| `/api/vehicles/`    | GET    | Public | Get all predefined vehicles   |
| `/api/vehicles/:id` | GET    | Public | Get vehicle by ID             |
| `/api/vehicles/`    | POST   | Public | Create vehicle (internal use) |
| `/api/vehicles/:id` | PUT    | Public | Update vehicle                |

### Vehicle fields

| Field       | Type                   |
| ----------- | ---------------------- |
| name        | String                 |
| fuelType    | petrol/diesel/electric |
| consumption | Number (L/100km)       |
| tankSize    | Number                 |
| description | String                 |

---

# **4. Fuel Prices API**

Source: `src/routes/fuelPrices.js`

### **GET /api/fuel-prices**

Returns all countries with gasoline, diesel, LPG prices.

---

# **5. Admin API**

Source: `src/routes/admin.js`

| Endpoint                 | Method | Description                              |
| ------------------------ | ------ | ---------------------------------------- |
| `/api/admin/fuel/update` | POST   | Update fuel prices via Puppeteer scraper |
| `/api/admin/fuel/update` | GET    | Browser-friendly trigger                 |
| `/api/admin/fuel/status` | GET    | Returns last update time & total records |

### Example Response

```json
{
  "success": true,
  "totalCountries": 31,
  "lastUpdate": "2025-02-10T12:32:11.102Z"
}
```

---

# **6. Trips API**

Source: `src/routes/trips.js`

Used internally or for admin/debug tools.

| Endpoint         | Method | Description    |
| ---------------- | ------ | -------------- |
| `/api/trips`     | GET    | List all trips |
| `/api/trips/:id` | GET    | Get trip by ID |
| `/api/trips`     | POST   | Create trip    |
| `/api/trips/:id` | DELETE | Delete trip    |

---

# **7. Health API**

Source: `src/routes/health.js`

### **GET /api/health**

Returns MongoDB connection status.

### Response example

```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected",
  "mongodb": {
    "state": 1,
    "host": "cluster0.mongodb.net",
    "name": "vicatomaps"
  }
}
```

---

# **8. Root Endpoint**

Base URL returns metadata.

### GET `/`

```json
{
  "message": "Vicatomaps API Server",
  "version": "1.0.0",
  "endpoints": { ... }
}
```
