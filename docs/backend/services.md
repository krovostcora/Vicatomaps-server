# Backend Services

This document describes all backend service modules in the Vicatomaps system.
Each service encapsulates a specific domain: routing, toll calculation, fuel price retrieval, vehicle management, and cost processing.
All services are stateless, modular, and designed for high reusability across route calculations, trip processing, and admin operations.

---

## 1. Route Service

Source: `routeService.js`

### Purpose

Handles all communication with **Google Routes API** and performs route normalization, country detection, and caching.

### Responsibilities

| Responsibility            | Description                                                      |
|---------------------------|------------------------------------------------------------------|
| Google Routes API request | Uses `fieldMask` to reduce cost and return structured route data |
| Polyline decoding         | Converts encoded polyline to coordinate list                     |
| Country detection         | Reverse-geocodes sampled polyline points                         |
| Route parsing             | Normalizes Google response → distance, duration, legs, tollInfo  |
| Caching                   | Uses `GoogleRouteCache` to prevent repeated API calls            |
| Multi-route support       | Returns multiple alternatives when available                     |

### Key Methods

### `getRoutes(origin, destination, waypoints)`

* Generates request body for Google API
* Resolves cache key (SHA-256)
* Loads from GoogleRouteCache if valid
* Otherwise fetches fresh routes
* Parses into internal format

### `parseRoutesResponse(response)`

Normalizes route structure:

```json
{
  "routeIndex": 0,
  "distance": 725000,
  "duration": 26000,
  "polyline": "...",
  "countries": [...],
  "tollInfo": {...},
  "legs": [...]
}
```

### `detectCountriesFromPolyline(polyline)`

* Samples polyline every N points
* Uses Google Geocoding API
* Ensures unique, ordered ISO2 codes

---

## 2. Cost Service

Source: `costService.js`

### Purpose

Central orchestrator for cost computation: **fuel**, **tolls**, and **total trip cost**.

### Responsibilities

| Function                  | Description                            |
|---------------------------|----------------------------------------|
| Fuel cost computation     | Uses vehicle consumption + fuel prices |
| Toll cost computation     | Delegates to tollService               |
| Total cost aggregation    | Combines fuel + toll cost              |
| Alternative route ranking | Identifies fastest and cheapest route  |

### Key Methods

### `calculateRouteCost(route, vehicle)`

Computes:

* totalLiters
* per-country fuel cost
* toll cost
* total cost

### `compareRoutes(routes)`

Adds:

```json
{
  "cheapest": <routeIndex>,
  "fastest": <routeIndex>,
  "savings": <difference>
}
```

---

## 3. Fuel Price Service

Source: `fuelPriceService.js`

### Purpose

Retrieves fuel prices for route countries and normalizes fuel types and country codes.

### Responsibilities

| Responsibility          | Description                                 |
|-------------------------|---------------------------------------------|
| ISO2 → ISO3 conversion  | Converts country codes for DB lookups       |
| Fuel type normalization | petrol → gasoline, diesel → diesel          |
| Single-country lookup   | Returns price per liter                     |
| Multi-country lookup    | Returns list of `{ country, price }` values |
| Initialization          | Creates default prices if DB empty          |

### Key Methods

### `getFuelPrice(countryCode, fuelType)`

Returns a single price in €/L.

### `getFuelPrices(countries, fuelType)`

Returns array:

```json
[
  { "countryCode": "DEU", "country": "Germany", "price": 1.76 }
]
```

---

## 4. Vehicle Service

Source: `vehicleService.js`

### Purpose

CRUD operations for vehicles stored in MongoDB.

### Responsibilities

| Responsibility         | Description                      |
|------------------------|----------------------------------|
| Fetch all vehicles     | Used for vehicle selection UI    |
| Fetch by ID            | Required for cost engine         |
| Create vehicle         | Admin or extension purposes      |
| Update vehicle         | Modify existing vehicle          |
| Default initialization | Creates baseline vehicle dataset |

### Key Methods

### `getAllVehicles()`

Returns all predefined vehicles.

### `getVehicleById(id)`

Fetches vehicle for a cost calculation request.

### `initializeDefaultVehicles()`

Creates initial dataset if DB empty.

---

## 5. Toll Service

Source: `tollService.js`

### Purpose

Computes toll cost using multiple data sources with fallback logic.

### Responsibilities

| Level                     | Description                      |
|---------------------------|----------------------------------|
| 1. TollGuru API           | Primary external toll estimation |
| 2. Google Estimated Price | Uses `estimatedPrice` field      |
| 3. Google leg tollInfo    | Extracts from individual legs    |
| 4. EU fallback model      | Distance-based & vignette rules  |

### Key Methods

### `estimateTolls(route)`

Returns:

```json
{
  "total": 12.50,
  "breakdown": [...],
  "source": "tollguru" | "google" | "fallback"
}
```

---

## 6. TollGuru Service

Source: `tollGuruService.js`

### Purpose

Thin client around TollGuru API with built-in caching.

### Responsibilities

| Responsibility         | Description               |
|------------------------|---------------------------|
| Polyline hashing       | SHA-256(polyline)         |
| Cache lookup           | Uses `TollCache`          |
| API call               | POST request to TollGuru  |
| Currency normalization | Converts all to EUR       |
| Error fallback         | Returns `null` on failure |

### Key Methods

### `getTollEstimate(polyline)`

Returns toll breakdown or `null` if API unavailable.

---

## 7. Shared Utilities & Caches

### 7.1 GoogleRouteCache

Stores:

* route response
* countries
* tollInfo
* TTL ≈ 60 days

### 7.2 TollCache

Stores:

* TollGuru API response
* Source currency
* Breakdown
* TTL ≈ 180 days

### 7.3 FuelPrice Collection

Stores normalized:

* gasoline
* diesel
* LPG
* ISO3 country codes

---

## 8. Error Handling Strategy

| Issue               | Mitigation                           |
|---------------------|--------------------------------------|
| Google API failure  | Fallback to cache or fail fast       |
| TollGuru error      | Use Google → fallback model          |
| Missing fuel prices | Fuel cost returns 0 for that country |
| Missing countries   | Skip fuel & toll calculation         |
| Vehicle missing     | 404 error returned                   |

All services fail gracefully and preserve system stability.

---

## 9. Summary

Vicatomaps service layer is designed as a modular, reusable architecture:

* `routeService`: routing + polyline + Google integration
* `costService`: cost orchestration (fuel + toll + total)
* `fuelPriceService`: live EU fuel price lookup
* `vehicleService`: vehicle dataset management
* `tollService`: multi-source toll computation
* `tollGuruService`: external toll API wrapper

This modular approach keeps the system maintainable, scalable, and extendable for future features like:
dynamic fuel price weighting, polyline-based fuel segmentation, machine-learning cost prediction, etc.
