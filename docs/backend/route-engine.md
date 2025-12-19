# Route Engine

This document describes the complete route-processing subsystem of the Vicatomaps backend.
It includes Google Routes API integration, polyline processing, route normalization, country detection, caching, and alternative route handling.

---

## 1. Overview

The Route Engine is responsible for transforming raw origin/destination data into structured route objects used by the cost engine.

Key responsibilities:

| Component           | Function                                          |
|---------------------|---------------------------------------------------|
| Google Routes API   | Fetches distance, duration, geometry, tollInfo    |
| Polyline decoding   | Converts encoded geometry into coordinates        |
| Country detection   | Reverse-geocodes sampled points from the polyline |
| Route normalization | Converts Google response into unified structure   |
| Caching             | Prevents redundant API calls using SHA-256 keys   |
| Alternative routes  | Supports multiple route options                   |

Source file: `src/services/routeService.js`

---

## 2. Input & Output

## 2.1 Input

```json
{
  "origin": { "lat": 54.6872, "lon": 25.2797 },
  "destination": { "lat": 52.5200, "lon": 13.4050 },
  "waypoints": [
    { "lat": 53.0000, "lon": 23.9000 }
  ]
}
```

## 2.2 Output

```json
[
  {
    "routeIndex": 0,
    "distance": 725000,
    "duration": 26000,
    "polyline": "encoded_string...",
    "countries": ["LT", "PL", "DE"],
    "tollInfo": { ... },
    "legs": [...],
    "cached": false
  }
]
```

---

## 3. Google Routes API Integration

The system uses **Routes API v2**, POST method, and selective field acquisition (`fieldMask`) to minimize billing.

### 3.1 Request

Fields requested:

* `routes.distanceMeters`
* `routes.duration`
* `routes.routes.legs.*`
* `routes.polyline.encodedPolyline`
* `routes.travelAdvisory.tollInfo`

This reduces API cost significantly.

### 3.2 Handling multiple routes

If Google returns multiple alternatives:

```json
routes[0], routes[1], routes[2]
```

The engine normalizes all of them.

---

## 4. Route Normalization

The method `parseRoutesResponse()`:

Transforms Google response into internal format:

| Field        | Description                        |
|--------------|------------------------------------|
| `routeIndex` | Index in the Google result array   |
| `distance`   | Total distance in meters           |
| `duration`   | Travel time in seconds             |
| `polyline`   | Encoded polyline                   |
| `legs`       | Leg-by-leg breakdown               |
| `tollInfo`   | Raw Google toll metadata           |
| `countries`  | Filled later via reverse geocoding |

Example:

```json
{
  "routeIndex": 0,
  "distance": 725000,
  "duration": 26000,
  "polyline": "a~l~Fjk~uOwHJy@P",
  "legs": [...],
  "tollInfo": { ... },
  "countries": []
}
```

---

## 5. Country Detection from Polyline

One of the most important backend features.

### 5.1 Workflow

```
decode polyline
   ↓
sample points (to reduce API calls)
   ↓
reverse geocode each point (Google Geocoding API)
   ↓
extract ISO2 country codes
   ↓
remove duplicates + preserve order
```

### 5.2 Sampling strategy

RouteService samples coordinates to avoid excessive API calls:

* Long polylines → 1 point every 200th entry
* Ensures accurate but cost-efficient country detection

### 5.3 Reverse geocoding

Each sampled point is sent to:

```
https://maps.googleapis.com/maps/api/geocode/json
```

The system extracts:

```
result.address_components → type: 'country'
```

Returned codes are always ISO2 (e.g., `DE`, `PL`).

---

## 6. Caching Layer

Caching prevents repetitive Google API calls for the same route.

## 6.1 Cache Model

`GoogleRouteCache`

Fields stored:

| Field       | Description                               |
|-------------|-------------------------------------------|
| `hash`      | SHA-256(origin + destination + waypoints) |
| `data`      | Parsed routes data (includes countries)   |
| `updatedAt` | For TTL eviction                          |

TTL ≈ **60 days**.

## 6.2 Workflow

```
createRequestHash()
↓
check GoogleRouteCache
↓ yes
return cached routes
↓ no
call Google API
normalize → detect countries
save to cache
return result
```

Caching dramatically reduces Google billing.

---

## 7. Polyline Handling

### 7.1 Decoding

The polyline is decoded using the official Google polyline algorithm into an array:

```json
[
  { "lat": 54.6872, "lon": 25.2797 },
  { "lat": 54.0000, "lon": 24.5000 },
  ...
]
```

### 7.2 Use cases

* distance-by-country calculation (future improvement)
* map rendering
* toll segmentation
* country detection

---

## 8. Alternative Routes Support

If Google returns multiple routes:

* each route is normalized
* cost engine evaluates each independently
* final response includes:

    * fastest route
    * cheapest route
    * savings value

---

## 9. Error Handling

| Error                    | Behavior                       |
|--------------------------|--------------------------------|
| Google API failure       | Return 500 to client           |
| No routes found          | Error thrown from routeService |
| Missing polyline         | Skip country detection         |
| Geocoding limit exceeded | Fallback: single-country route |

Errors never break the cost engine.

---

## 10. Summary

The Route Engine provides:

* Efficient Google Routes API communication
* Reliable polyline → country mapping
* Structured multi-route normalization
* Persistent caching to reduce costs
* Clean separation between route retrieval and cost calculation

It is one of the core subsystems powering the Vicatomaps navigation and cost estimation workflow.
