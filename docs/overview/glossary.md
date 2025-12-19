# Glossary

This glossary defines all key technical terms, components, and concepts used throughout the Vicatomaps backend documentation.
Terms are listed alphabetically for clarity.

---

## A

### Admin API
Set of privileged endpoints used for fuel price updates and internal diagnostics.
Defined in `src/routes/admin.js`.

### API Layer
The Express routing layer responsible for exposing REST endpoints (`/api/routes`, `/api/vehicles`, etc.).
Configured in `server.js`.

---

## B

### Backend Services
Modular Node.js services handling business logic: routeService, costService, fuelPriceService, tollService, TollGuru integration, vehicleService.

### Bearer Token
Authorization header format used for Firebase ID tokens:
```
Authorization: Bearer <token>
```

---

## C

### Cache (Route Cache / Toll Cache)
MongoDB-backed caching used to reduce Google API and TollGuru API calls.
Models: `GoogleRouteCache`, `TollCache`.

### Cost Engine
Subsystem responsible for calculating total trip cost:
- fuel cost
- toll cost
- total
Implemented in `costService.js`.

### Countries Detection
Process of inferring all countries along a polyline route by reverse geocoding sampled coordinates.
Implemented inside `routeService.js`.

---

## D

### Distance-Based Toll
Toll model where cost = price-per-km × distance. Used for FR, IT, ES, PT, PL, HR, GR.
Fallback logic implemented in `tollService.js`.

---

## E

### Encoded Polyline
String representing route geometry returned by Google.
Decoded to coordinate arrays for country detection and potential per-country distance calculations.

### Environment Variables
Configuration values stored outside code:
`GOOGLE_ROUTES_API_KEY`, `MONGODB_URI`, `TOLLGURU_API_KEY`, Firebase keys, etc.
Used in `database.js`, `firebase.js`, `server.js`.

---

## F

### Fallback Toll Model
Internal logic estimating tolls when TollGuru and Google data are unavailable.
Country rules defined inside `tollService.js`.

### Firebase Admin
Authentication provider used for verifying ID tokens.
Configured in `firebase.js`.

### Fuel Price Scraper
Puppeteer script that extracts fuel prices from tolls.eu (`scrapeFuelPrices.js`).

---

## G

### Geocoding
Conversion of place names → coordinates.
Used when parsing Google Maps URLs in `googleMapsParser.js`.

### Google Routes API
External service providing routes, distances, durations, tollInfo, and polylines.
Used in `routeService.js`.

---

## H

### Health Endpoint
Backend endpoint returning database/server status: `/api/health`.
Defined in `src/routes/health.js`.

---

## L

### Leg
A segment of a Google route between two waypoints.
Included in the normalized route structure.

### Liters Consumption
Computed as:
```
liters = (distance / 100) * consumption
```
Used in the cost engine.

---

## M

### Middleware
Layer processing requests between client and route handlers.
Includes authentication middleware.
Source: `authenticate.js`.

### MongoDB Atlas
Cloud-hosted database used for persistent storage.

---

## P

### Polyline
Encoded representation of a route path, used for:
- toll calculations (TollGuru)
- country detection
- map rendering

---

## R

### Route Engine
Subsystem responsible for:
- calling Google Routes API
- parsing routes
- country detection
- caching

Source: `routeService.js`.

### Render Deploy Hook
Secret webhook URL that triggers deployment via GitHub Actions.

### GoogleRouteCache
Primary MongoDB collection storing cached route results.
RouteCache is deprecated and no longer used.

---

## S

### Scraper Workflow
GitHub Action that updates fuel prices weekly.
Source: `update-fuel-prices.yml`.

### Services Layer
Core backend logic implemented in `src/services/`.

---

## T

### Toll Engine
Subsystem computing toll cost using:
1. TollGuru API
2. Google tollInfo
3. Leg-level tolls
4. EU fallback model
Source: `tollService.js`.

### TollGuru API
Primary toll estimation provider.
Integration via `tollGuruService.js`.

---

## U

### UserTrip
Model storing trip history for authenticated users.
Stored after successful cost calculation.
Source: `UserTrip.js`.

---

## V

### Vehicle Model
Represents vehicle parameters (fuel type, consumption, tank size) used by the cost engine.
Source: `Vehicle.js` + `vehicleService.js`.

---

## W

### Waypoints
Optional intermediate points in route calculation.

---
