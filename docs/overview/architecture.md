# **System Architecture**

This document describes the complete architecture of the Vicatomaps backend system, including API layers, services, caching, external integrations, and data flow. The architecture is modular, stateless, and optimized for high-performance route processing and cost estimation.

---

# **1. High-Level Architecture**

Vicatomaps consists of two main components:

* **Mobile Client (Flutter)**
* **Backend (Node.js + Express + MongoDB)**

```
Flutter App
   ↓ REST API
Express Server
   ↓ Services Layer
Cost Engine  ←→ Fuel Price System
Route Engine ←→ Google Routes API
Toll Engine  ←→ TollGuru API
   ↓
MongoDB (Vehicles, FuelPrices, Trips, Caches)
```

The system is designed with strict separation of concerns:

| Layer                 | Description                                 |
| --------------------- | ------------------------------------------- |
| API Layer             | Request routing, validation, auth           |
| Services Layer        | Business logic (routing, tolls, fuel, cost) |
| External Integrations | Google Routes, TollGuru, Puppeteer scraper  |
| Data Layer            | MongoDB models & caches                     |
| Middleware            | Auth, rate limiting, security               |

---

# **2. Backend Components**

The backend is divided into the following modules:

| Module              | Responsibility                       |
| ------------------- | ------------------------------------ |
| **Routes API**      | Navigation & cost calculation        |
| **Vehicles API**    | Vehicle dataset retrieval            |
| **Fuel Prices API** | Latest fuel price data               |
| **Trips API**       | Trip history for authenticated users |
| **Auth API**        | Firebase-based authentication        |
| **Admin API**       | Fuel price scraping and diagnostics  |

---

# **3. Service Layer Architecture**

The services folder contains the entire business logic of the application.

| Service            | Function                                                              |
| ------------------ | --------------------------------------------------------------------- |
| `routeService`     | Google Routes API integration, route normalization, country detection |
| `costService`      | Fuel + toll + total cost calculation, route comparison                |
| `fuelPriceService` | Live fuel price retrieval and normalization                           |
| `vehicleService`   | Vehicle lookup and management                                         |
| `tollService`      | Multi-layer toll calculation (TollGuru → Google → fallback)           |
| `tollGuruService`  | External TollGuru API client with caching                             |

Each service is stateless and can be invoked independently.

---

# **4. Data Layer**

MongoDB stores:

| Collection           | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| **Vehicles**         | Predefined vehicle dataset (fuel type, consumption, tank size) |
| **FuelPrices**       | Latest scraped prices for gasoline, diesel, LPG                |
| **GoogleRouteCache** | Cached Google Routes API responses                             |
| **TollCache**        | Cached TollGuru toll results                                   |
| **RouteCache**       | Legacy/auxiliary route caching                                 |
| **UserTrip**         | Stored trip history for authenticated users                    |
| **User**             | User profiles linked to Firebase UID                           |

Caching reduces both Google API and TollGuru API usage costs.

---

# **5. External Integrations**

### **5.1 Google Routes API**

Used to retrieve:

* distance
* duration
* polyline
* route geometry
* country detection via reverse geocoding
* tollInfo (where available)

Techniques used:

* **fieldMask** to minimize billing
* **polyline decoding**
* **sampling** to reduce geocode API usage
* **SHA-256 route hashing** for caching

---

### **5.2 TollGuru API**

Provides toll price breakdown across highways, tunnels, segments.

* Caching with SHA-256(polyline)
* TTL ≈ 6 months
* Fallback mechanisms if API fails

---

### **5.3 Puppeteer Fuel Scraper**

Scrapes tolls.eu:

* gasoline, diesel, LPG prices
* ISO2 → ISO3 conversion
* Weekly or manual updates

---

# **6. Request Processing Pipeline**

Below is the full pipeline for the main endpoint
**POST /api/routes/calculate**:

```
Client → /api/routes/calculate
   ↓
optionalAuth middleware
   ↓
routeService.getRoutes()
      ↓ Google Routes API
      ↓ Reverse geocoding
      ↓ GoogleRouteCache
   ↓
costService.calculateRouteCost()
      ↓ vehicleService
      ↓ fuelPriceService
      ↓ tollService
              ↓ tollGuruService
              ↓ Google estimated tolls
              ↓ fallback toll model
   ↓
Trip saved if user authenticated
   ↓
Response returned to client
```

---

# **7. Caching Layer**

Caching is essential for reducing API costs and improving performance.

| Cache                | Key                                       | TTL         | Description                         |
| -------------------- | ----------------------------------------- | ----------- | ----------------------------------- |
| **GoogleRouteCache** | SHA-256(origin + destination + waypoints) | ~60 days    | Stores parsed routes & country list |
| **TollCache**        | SHA-256(polyline)                         | ~6 months   | Stores TollGuru toll results        |
| **FuelPrices**       | Full replace                              | Manual/cron | Cached via database directly        |

All caches stored in MongoDB for simplicity and portability.

---

# **8. Security Architecture**

### **8.1 Backend Security**

* `helmet()` for HTTP headers
* Rate limiting: 100 requests / 15 min
* CORS enabled
* Firebase ID token authentication

### **8.2 Firebase Authentication**

* Backend validates tokens using Firebase Admin
* `authenticate` middleware → strict mode
* `optionalAuth` → guest mode

### **8.3 Environment Variables**

* Google API keys
* TollGuru API key
* Firebase private key
* MongoDB URI

All secrets are stored outside the repository.

---

# **9. Deployment Architecture**

(Full deployment details in `devops/deployment.md`, but summary included here.)

| Component      | Environment                     |
| -------------- | ------------------------------- |
| Backend server | Node.js on Render/VPS           |
| Database       | MongoDB Atlas                   |
| Fuel scraper   | Cron-triggered Puppeteer script |
| API keys       | Environment variables           |

---

# **10. System Strengths**

* Modular microservice-style structure
* Clean separation of routing, cost, toll, fuel logic
* Efficient caching to reduce API costs
* Resilient multi-fallback toll system
* Modern cloud-native design (Firebase + Atlas)
* Extensible architecture for future features

---

# **11. Future Improvements**

* Polyline-based **per-country distance calculation**
* Machine-learning cost estimation
* EV-specific routing & charging
* Full offline caching for mobile client
* Multi-vehicle comparison dashboard

---
