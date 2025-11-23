# Error Handling Specification

This document describes the unified error-handling strategy for the Vicatomaps backend, including error formats, HTTP codes, service-level behaviour, fallback logic, and recovery mechanisms.

The backend follows a strict error response structure and uses a layered approach to prevent hard failures while interacting with external APIs (Google, TollGuru, Puppeteer).

---

# 1. Error Response Format

All errors returned from the API follow the same JSON structure:

```json
{
  "error": {
    "message": "Human-readable description",
    "status": 400
  }
}
````

This format is applied in:

* Express error middleware
* Authentication middleware
* Service-level error handlers
* Validation failures

---

# 2. HTTP Status Codes

| Code    | Meaning           | When Used                                |
| ------- | ----------------- | ---------------------------------------- |
| **400** | Bad Request       | Invalid input, missing fields            |
| **401** | Unauthorized      | Missing / invalid Firebase token         |
| **403** | Forbidden         | (Reserved for future admin restrictions) |
| **404** | Not Found         | Resource not found (trip, vehicle, user) |
| **429** | Too Many Requests | Rate limiter triggered                   |
| **500** | Server Error      | Unhandled exception, API error           |

---

# 3. Authentication Errors

Authentication is handled via Firebase Admin SDK (`authenticate` middleware).
Common error patterns:

### 3.1 Missing token

```json
{
  "success": false,
  "error": "No authorization token provided"
}
```

### 3.2 Invalid format

Triggered when header doesn't start with `"Bearer "`.

### 3.3 Expired token

Returned when Firebase validation throws an expiration error.

```json
{
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

### 3.4 Invalid token

```json
{
  "error": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

### 3.5 User not found in MongoDB

Token valid but user not registered:

```json
{
  "error": "User not found in database. Please complete registration."
}
```

All definitions come from `src/middleware/authenticate.js`.


---

# 4. Route Engine Errors

Source: `routeService.js`


### 4.1 Google API failures

* network errors
* invalid API key
* exceeded quota
* malformed response

Backend behaviour:

* throws a 500-level error
* caught by Express error middleware

The error message includes:

```
'Failed to fetch Google routes' or original API error
```

### 4.2 No routes returned

If Google responds with an empty route list:

```
throw new Error("No routes found for this request")
```

### 4.3 Geocoding failures

Reverse-geocoding fallback:

* If country detection fails → countries = []
* Cost engine will compute fuel cost = 0
* Toll engine will compute toll cost = 0

System never crashes on geocode errors.

---

# 5. Cost Engine Errors

Source: `costService.js`


### 5.1 Missing vehicle

If `vehicleId` is invalid:

```
throw new Error("Vehicle not found")
```

Returned as `404` by route handler.

### 5.2 Missing country data

If no countries detected:

```
⚠️ No countries detected...
fuelCost.total = 0
tollCost.total = 0
```

### 5.3 Missing fuel prices

If fuel price missing for a country:

* Estimated liters computed normally
* `pricePerLiter = null`
* `countryCost = 0`
* No crash

### 5.4 Internal computation errors

Any unexpected error is caught:

```
console.error("Cost calculation failed:", error)
```

Response:

```json
{
  "error": "Failed to calculate route cost"
}
```

---

# 6. Fuel System Errors

Source: `fuelPriceService.js`


### 6.1 Invalid fuel type

Normalized to gasoline/diesel/LPG; invalid types return null prices.

### 6.2 Missing price data

Returned price = `null`, breakdown cost = 0.

### 6.3 Scraper errors

From `scripts/scrapeFuelPrices.js`:


* Puppeteer crash
* DOM selector change
* No network

Behaviour:

* Log → `"Scraper failed"`
* DB unchanged (safety principle)
* Admin/API returns failure code

---

# 7. Toll System Errors

Source: `tollService.js`

and `tollGuruService.js`


### 7.1 TollGuru API error

If TollGuru fails:

* network timeout
* invalid key
* rate limit
* malformed response

Engine behaviour:

* Skip TollGuru
* Try Google tollInfo
* Try fallback model

Never throws fatal errors.

### 7.2 Google tollInfo missing

Occurs often in EU.
Fallback model activated automatically.

### 7.3 Invalid polyline

TollGuru disabled; only fallback model used.

### 7.4 Partial toll data

If some legs contain tollInfo, but not all:

* Combine leg tolls
* Fill missing parts with fallback model

---

# 8. Trip Storage Errors

Source: `UserTrip.js` & route handler.


### 8.1 Trip saving skipped for guests

No error — returns `savedToHistory: false`.

### 8.2 MongoDB failure

If DB write fails:

* Calculation still returned
* Trip not saved
* Printed server error
* Not exposed to user

---

# 9. Server-Level Errors

Defined in `server.js` final middleware.


### Express error handler:

Returns 500 + error JSON.

```json
{
  "error": {
    "message": "Internal server error",
    "status": 500
  }
}
```

### 404 handler:

```json
{
  "success": false,
  "error": "Endpoint not found"
}
```

---

# 10. Rate Limiting Errors

Configured in `server.js`:

```
100 requests / 15 minutes / IP
```

Exceeded limit → 429:

```json
{
  "message": "Too many requests"
}
```

---

# 11. Summary

The Vicatomaps backend uses a **strict, predictable, resilient error handling strategy**:

* Unified JSON error format
* Never crashes on external API failures
* Toll & fuel systems degrade gracefully
* Authentication errors are well-classified
* Caches reduce failure probability
* Fallback logic covers non-responsive services
* Express middleware guarantees stable responses

This ensures the system remains reliable even when third-party services fail or provide incomplete data.

---
