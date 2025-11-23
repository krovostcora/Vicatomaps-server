# Glossary

This glossary defines all key technical terms, components, and concepts used throughout the Vicatomaps backend documentation.  
Terms are listed alphabetically for clarity.

---

## A

### **Admin API**
Set of privileged endpoints used for fuel price updates and internal diagnostics.  
Defined in `src/routes/admin.js`. :contentReference[oaicite:0]{index=0}

### **API Layer**
The Express routing layer responsible for exposing REST endpoints (`/api/routes`, `/api/vehicles`, etc.).  
Configured in `server.js`. :contentReference[oaicite:1]{index=1}

---

## B

### **Backend Services**
Modular Node.js services handling business logic: routeService, costService, fuelPriceService, tollService, TollGuru integration, vehicleService.

### **Bearer Token**
Authorization header format used for Firebase ID tokens:
```

Authorization: Bearer <token>

```

---

## C

### **Cache (Route Cache / Toll Cache)**
MongoDB-backed caching used to reduce Google API and TollGuru API calls.  
Models: `GoogleRouteCache`, `TollCache`. :contentReference[oaicite:2]{index=2}:contentReference[oaicite:3]{index=3}

### **Cost Engine**
Subsystem responsible for calculating total trip cost:
- fuel cost  
- toll cost  
- total  
Implemented in `costService.js`. :contentReference[oaicite:4]{index=4}

### **Countries Detection**
Process of inferring all countries along a polyline route by reverse geocoding sampled coordinates.  
Implemented inside `routeService.js`. :contentReference[oaicite:5]{index=5}

---

## D

### **Distance-Based Toll**
Toll model where cost = price-per-km × distance. Used for FR, IT, ES.  
Fallback logic implemented in `tollService.js`. :contentReference[oaicite:6]{index=6}

---

## E

### **Encoded Polyline**
String representing route geometry returned by Google.  
Decoded to coordinate arrays for country detection and potential per-country distance calculations.

### **Environment Variables**
Configuration values stored outside code:  
`GOOGLE_ROUTES_API_KEY`, `MONGODB_URI`, `TOLLGURU_API_KEY`, Firebase keys, etc.  
Used in `database.js`, `firebase.js`, `server.js`.  
:contentReference[oaicite:7]{index=7}:contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}

---

## F

### **Fallback Toll Model**
Internal logic estimating tolls when TollGuru and Google data are unavailable.  
Country rules defined inside `tollService.js`.  
:contentReference[oaicite:10]{index=10}

### **Firebase Admin**
Authentication provider used for verifying ID tokens.  
Configured in `firebase.js`. :contentReference[oaicite:11]{index=11}

### **Fuel Price Scraper**
Puppeteer script that extracts fuel prices from tolls.eu (`scrapeFuelPrices.js`).  
:contentReference[oaicite:12]{index=12}

---

## G

### **Geocoding**
Conversion of place names → coordinates.  
Used when parsing Google Maps URLs in `googleMapsParser.js`.  
:contentReference[oaicite:13]{index=13}

### **Google Routes API**
External service providing routes, distances, durations, tollInfo, and polylines.  
Used in `routeService.js`.  
:contentReference[oaicite:14]{index=14}

---

## H

### **Health Endpoint**
Backend endpoint returning database/server status: `/api/health`.  
Defined in `src/routes/health.js`. :contentReference[oaicite:15]{index=15}

---

## L

### **Leg**
A segment of a Google route between two waypoints.  
Included in the normalized route structure.

### **Liters Consumption**
Computed as:
```

liters = (distance / 100) * consumption

```
Used in the cost engine.  
:contentReference[oaicite:16]{index=16}

---

## M

### **Middleware**
Layer processing requests between client and route handlers.  
Includes authentication middleware.  
Source: `authenticate.js`. :contentReference[oaicite:17]{index=17}

### **MongoDB Atlas**
Cloud-hosted database used for persistent storage.

---

## P

### **Polyline**
Encoded representation of a route path, used for:
- toll calculations (TollGuru)
- country detection
- map rendering  

---

## R

### **Route Engine**
Subsystem responsible for:
- calling Google Routes API  
- parsing routes  
- country detection  
- caching  

Source: `routeService.js`.  
:contentReference[oaicite:18]{index=18}

### **Render Deploy Hook**
Secret webhook URL that triggers deployment via GitHub Actions.  
:contentReference[oaicite:19]{index=19}

### **RouteCache / GoogleRouteCache**
MongoDB collections storing cached route results.  
:contentReference[oaicite:20]{index=20}

---

## S

### **Scraper Workflow**
GitHub Action that updates fuel prices weekly.  
Source: `update-fuel-prices.yml`.  
:contentReference[oaicite:21]{index=21}

### **Services Layer**
Core backend logic implemented in `src/services/`.

---

## T

### **Toll Engine**
Subsystem computing toll cost using:
1. TollGuru API  
2. Google tollInfo  
3. Leg-level tolls  
4. EU fallback model  
Source: `tollService.js`.  
:contentReference[oaicite:22]{index=22}

### **TollGuru API**
Primary toll estimation provider.  
Integration via `tollGuruService.js`.  
:contentReference[oaicite:23]{index=23}

---

## U

### **UserTrip**
Model storing trip history for authenticated users.  
Stored after successful cost calculation.  
Source: `UserTrip.js`.  
:contentReference[oaicite:24]{index=24}

---

## V

### **Vehicle Model**
Represents vehicle parameters (fuel type, consumption, tank size) used by the cost engine.  
Source: `Vehicle.js` + `vehicleService.js`.  
:contentReference[oaicite:25]{index=25}:contentReference[oaicite:26]{index=26}

---

## W

### **Waypoints**
Optional intermediate points in route calculation.

---
