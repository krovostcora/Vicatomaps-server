# Database Schema

This document describes all MongoDB collections used by the Vicatomaps backend.

---

## 1. FuelPrice

**Collection:** `fuelprices`
**Model:** `FuelPrice.js`

Stores fuel price data scraped from tolls.eu.

| Field         | Type   | Description                              |
|---------------|--------|------------------------------------------|
| `countryCode` | String | Country code from scraper (e.g. `"AUT"`) |
| `country`     | String | Full country name                        |
| `gasoline`    | Number | Price per liter (may be null)            |
| `diesel`      | Number | Price per liter (may be null)            |
| `lpg`         | Number | Price per liter (may be null)            |
| `updatedAt`   | Date   | Last scrape time                         |
| `createdAt`   | Date   | Auto-generated                           |

Indexes:
- `countryCode` (unique)

---

## 2. GoogleRouteCache

**Collection:** `googleroutecaches`
**Model:** `GoogleRouteCache.js`

Caches parsed Google Routes API results, including geometry, distance, toll info and detected countries.

| Field       | Type   | Description                            |
|-------------|--------|----------------------------------------|
| `hash`      | String | SHA-256 hash of route input parameters |
| `data`      | Object | Parsed Google routes data              |
| `updatedAt` | Date   | Last refresh time                      |

Route data structure:

| Field        | Type   | Description                    |
|--------------|--------|--------------------------------|
| `routeIndex` | Number | Index inside Google API result |
| `distance`   | Number | Kilometers                     |
| `duration`   | Number | Seconds                        |
| `polyline`   | String | Encoded polyline               |
| `legs`       | Array  | Per-leg details                |
| `tollInfo`   | Object | Toll info from Google          |
| `countries`  | Array  | ISO2 countries on this route   |

Notes:
- Countries are stored here (added directly by routeService)
- This is the primary route cache
- TTL ~60 days managed in routeService.js

---

## 3. RouteCache (Deprecated)

**Collection:** `routecaches`
**Model:** `RouteCache.js`

This cache is no longer used in Vicatomaps.

| Field         | Type           | Description                              |
|---------------|----------------|------------------------------------------|
| `origin`      | String         | `"lat,lon"` format                       |
| `destination` | String         | `"lat,lon"` format                       |
| `waypoints`   | [String]       | Optional waypoints                       |
| `countries`   | [String]       | Detected ISO2 codes (e.g. `["PL","DE"]`) |
| `polyline`    | String or null | Currently not used by routeService       |
| `createdAt`   | Date           | Auto-created, expires in 90 days         |

---

## 4. TollCache

**Collection:** `tollcaches`
**Model:** `TollCache.js`

Stores TollGuru API responses for a given polyline hash.

| Field       | Type   | Description               |
|-------------|--------|---------------------------|
| `hash`      | String | SHA-256 of route polyline |
| `data`      | Object | Parsed TollGuru response  |
| `updatedAt` | Date   | Last update               |

Notes:
- Used as primary source before calling TollGuru API again
- No TTL configured; expiration handled manually in code (6-month validity)

---

## 5. Vehicle

**Collection:** `vehicles`
**Model:** `Vehicle.js`

Predefined vehicle configurations.

| Field         | Type                                           | Description                     |
|---------------|------------------------------------------------|---------------------------------|
| `name`        | String                                         | Vehicle name (unique)           |
| `fuelType`    | String (`petrol`, `diesel`, `electric`, `lpg`) | Lowercase                       |
| `consumption` | Number                                         | L/100 km (or kWh/100 km for EV) |
| `tankSize`    | Number                                         | Liters or battery kWh           |
| `description` | String                                         | Optional text                   |
| `createdAt`   | Date                                           | Auto                            |
| `updatedAt`   | Date                                           | Auto                            |

---

## 6. UserTrip

**Collection:** `usertrips`
**Model:** `UserTrip.js`

Simplified trip history model used by `/api/routes/history`.

| Field               | Type               | Description                             |
|---------------------|--------------------|-----------------------------------------|
| `userId`            | ObjectId → User    | Owner of the trip                       |
| `origin`            | String             | e.g. `"Kaunas, Lithuania"`              |
| `destination`       | String             | e.g. `"Warszawa, Poland"`               |
| `originCoords`      | Object `{lat,lon}` | Coordinates                             |
| `destinationCoords` | Object `{lat,lon}` | Coordinates                             |
| `waypoints`         | [String]           | Optional text waypoints                 |
| `vehicle`           | ObjectId → Vehicle | Vehicle used                            |
| `totalCost`         | Number             | EUR                                     |
| `totalDistance`     | Number             | In km or meters depending on code       |
| `fuelCost`          | Number             | Total fuel cost                         |
| `fuelBreakdown`     | Array              | Per-country breakdown                   |
| `tollCost`          | Number             | Toll cost                               |
| `duration`          | Number             | Seconds                                 |
| `countries`         | [String]           | ISO2 route countries                    |
| `routeData`         | Mixed              | Optional raw route                      |
| `googleMapsUrl`     | String             | Source URL if imported from Google Maps |
| `notes`             | String             | Future feature                          |
| `isFavorite`        | Boolean            | Default false                           |
| `createdAt`         | Date               | Auto                                    |
| `updatedAt`         | Date               | Auto                                    |

---

## 7. Trip (Legacy)

**Collection:** `trips`
**Model:** `Trip.js`

Older version of the trip model. Used by older `/api/trips` endpoints.

| Field         | Type     | Description                    |
|---------------|----------|--------------------------------|
| `userId`      | ObjectId | User reference                 |
| `vehicleId`   | ObjectId | Vehicle reference              |
| `origin`      | Object   | `{lat, lon, address}`          |
| `destination` | Object   | `{lat, lon, address}`          |
| `waypoints`   | Array    | Coordinate-based               |
| `distance`    | Number   | Meters                         |
| `duration`    | Number   | Seconds                        |
| `countries`   | [String] | Array of country codes         |
| `fuelCost`    | Object   | Totals + per-country breakdown |
| `tollCost`    | Number   | Toll cost                      |
| `totalCost`   | Number   | Total cost                     |
| `currency`    | String   | `"EUR"`                        |
| `createdAt`   | Date     | Creation date                  |
| `notes`       | String   | Optional                       |
| `isFavorite`  | Boolean  | Default false                  |
| `actualCost`  | Number   | Optional manual override       |

Notes:
- Still present in DB in some installations
- Not used by `/api/routes/history`

---

## 8. User

**Collection:** `users`
**Model:** `User.js`

User profiles linked to Firebase authentication.

| Field                           | Type     | Description                     |
|---------------------------------|----------|---------------------------------|
| `firebaseUid`                   | String   | Unique identifier from Firebase |
| `email`                         | String   | User email                      |
| `displayName`                   | String   | User display name               |
| `photoURL`                      | String   | Avatar URL                      |
| `provider`                      | String   | Auth provider (google, apple)   |
| `preferences.language`          | String   | App language                    |
| `preferences.darkMode`          | Boolean  | Theme preference                |
| `preferences.defaultVehicleId`  | ObjectId | User's default vehicle          |
| `preferences.measurementSystem` | String   | Metric/imperial                 |
| `lastLogin`                     | Date     | Updated on each request         |
| `createdAt`                     | Date     | Account creation                |
| `updatedAt`                     | Date     | Last update                     |

---

## 9. Summary

| Collection          | Purpose                           |
|---------------------|-----------------------------------|
| `fuelprices`        | Fuel price data (scraped)         |
| `googleroutecaches` | Cached Google API route responses |
| `tollcaches`        | Saved TollGuru results            |
| `vehicles`          | Vehicle definitions               |
| `usertrips`         | User trip history                 |
| `trips`             | Legacy trip storage               |
| `users`             | Authenticated users               |
