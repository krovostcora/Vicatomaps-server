# Product Specification — Vicatomaps Backend

This document defines the functional scope, system capabilities, data flows, and constraints of the Vicatomaps backend.
It serves as the primary reference for engineering, QA, and product planning.

---

## 1. Product Overview

Vicatomaps is a cost-oriented navigation platform designed to help users plan long-distance road trips across Europe by calculating:

- fuel cost,
- toll cost,
- country breakdown,
- alternative route comparison,
- full trip summary.

The backend provides all computational, integration, caching, and data services needed by the mobile application.

---

## 2. Core Features

### 2.1 Route Calculation (Google Routes API)
- Multi-country route support
- Polyline extraction
- Distance & duration
- TollInfo retrieval (where supported)
- Alternative routes (up to 3)

Backend responsibility:
- normalize route data
- extract legs
- detect countries
- cache route results

---

### 2.2 Cost Calculation Engine
Computed server-side based on real data:

| Component           | Source                        |
|---------------------|-------------------------------|
| Fuel prices         | Scraped weekly from tolls.eu  |
| Vehicle consumption | User-selected vehicle         |
| Toll cost           | TollGuru API + fallback logic |
| Country detection   | Google Geocoding API          |
| Route geometry      | Google Routes API             |

The engine returns:
- fuel cost (total + per-country)
- toll cost (API/Google/fallback)
- total trip cost
- alternative route comparison (fastest vs cheapest)

---

### 2.3 Toll System Integration
Multi-layer toll estimation:

1. **TollGuru API**
2. Google `estimatedPrice`
3. Leg-level tollInfo
4. Internal country model (fallback)

Provides:
- detailed breakdown (country-level)
- total price in EUR
- caching (SHA-256(polyline))

---

### 2.4 Fuel Price Management
Weekly automated fuel updates via GitHub Actions.

- Puppeteer scraper for tolls.eu
- Parses gasoline/diesel/LPG
- Saves clean normalized prices to MongoDB
- Admin API endpoint for manual update
- Used directly by fuel cost engine

---

### 2.5 Vehicle Database
Predefined vehicle models with:

- fuel type
- consumption (L/100km)
- tank size
- description

Used to compute consumption across countries.

---

### 2.6 Trip History (Authenticated Only)
- Trip saved automatically after successful calculation
- Stores:
  - origin/destination
  - route distance & duration
  - country list
  - cost breakdown
  - total cost
  - selected vehicle
  - timestamp

Supports:
- pagination
- retrieval
- deletion

---

### 2.7 Google Maps URL Import
Supports importing routes from:

- short URLs (maps.app.goo.gl)
- long URLs (/dir/...)
- old-style `?saddr=&daddr=` URLs
- encoded data parameters

System automatically:
- expands short URL
- parses route
- geocodes missing points
- calculates full cost

---

## 3. Non-Functional Requirements

### 3.1 Performance
- Google API response caching → < 1 second average retrieval
- TollGuru cached for 6 months
- Route cache lifetime ≈ 60 days
- MongoDB operations < 50 ms average

### 3.2 Availability
- Backend hosted on Render
- Database on MongoDB Atlas
- Automatic deployment on push
- Weekly CRON job for scraper

### 3.3 Scalability
- Stateless services
- Horizontal scalability supported
- Caching reduces API load
- Firebase handles identity management

### 3.4 Security
- Firebase ID token validation
- Helmet, CORS, rate-limit middleware
- Secrets stored as environment variables
- Error sanitization for production

---

## 4. System Architecture Summary

Backend consists of:

| Module          | Responsibility                                     |
|-----------------|----------------------------------------------------|
| Route Engine    | Google routes, polyline parsing, country detection |
| Cost Engine     | Fuel + toll + total cost computation               |
| Fuel System     | Scraping + normalized fuel pricing                 |
| Toll System     | TollGuru + Google + fallback model                 |
| Vehicle Service | Vehicle dataset management                         |
| Auth System     | Firebase token verification                        |
| Trip Service    | Save + retrieve trip history                       |

Supporting infrastructure:
- MongoDB models
- Automated GitHub Workflows
- Caching layers

---

## 5. Data Flows

### 5.1 Route Calculation Flow

```
Client
→ /api/routes/calculate
→ optionalAuth()
→ routeService.getRoutes()
→ Google Routes API
→ country detection
→ route caching
→ costService.calculateRouteCost()
→ vehicleService
→ fuelPriceService
→ tollService
→ save trip (if authenticated)
← response to client
```

---

### 5.2 Fuel Update Flow (Weekly)

```
GitHub Actions (CRON)
→ wake Render server
→ /api/admin/fuel/update
→ scrapeFuelPrices.js
→ Puppeteer scrape
→ normalize data
→ replace DB contents
← verify /fuel/status
```

---

## 6. API Reliability Strategy

| Risk                | Mitigation                           |
|---------------------|--------------------------------------|
| Google API limit    | Caching + fieldMask minimizing usage |
| TollGuru downtime   | Google → fallback model              |
| Missing fuel prices | Per-country zero fallback            |
| Render sleep        | GitHub action wake step              |
| DB latency          | Atlas cluster scaling                |

---

## 7. Product Constraints

- Requires active Google API and TollGuru API keys
- Requires weekly fuel updates (scraper)
- Toll accuracy depends on TollGuru coverage
- Country distance split is equal (improvable later)

---

## 8. Future Enhancements

- Per-country distance segmentation from polyline
- EV routing (charging stops, kWh cost)
- ML-based cost prediction
- Multi-vehicle comparison
- Intelligent waypoint optimization
- Offline region caching

---
