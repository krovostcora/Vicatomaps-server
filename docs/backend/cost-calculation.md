# **Cost Calculation Engine**

This document describes the full cost-calculation logic used in the Vicatomaps backend.
The engine computes **fuel cost**, **toll cost**, **route alternatives**, and **total trip cost**, using real vehicle specifications, live fuel prices, and toll data from multiple sources.

---

# **1. Overview**

Cost calculation is handled by the `CostService` module. It processes a parsed route returned from Google Routes API and produces:

* Fuel cost (total + per-country breakdown)
* Toll cost (multiple estimation layers)
* Total trip cost
* Cost comparison across alternative routes

The engine is deterministic, modular, and relies on actual MongoDB data and cached external APIs.

---

# **2. Inputs & Outputs**

## **2.1 Inputs**

| Input             | Source               | Description               |
| ----------------- | -------------------- | ------------------------- |
| `route.distance`  | Google Routes API    | Total distance in km      |
| `route.countries` | Reverse geocoding    | ISO2 country list         |
| `vehicleId`       | MongoDB              | Fuel type and consumption |
| Fuel prices       | FuelPrice collection | Live scraped EU prices    |
| Toll info         | TollGuru + Google    | API and fallback logic    |

---

## **2.2 Output Format**

The cost engine returns the following structure:

```json
{
  "fuelCost": {
    "total": 42.30,
    "totalLiters": 23.18,
    "breakdown": [...]
  },
  "tollCost": {
    "total": 12.50,
    "breakdown": [...]
  },
  "totalCost": 54.80,
  "currency": "EUR"
}
```

---

# **3. Calculation Flow**

Below is the exact internal workflow as implemented in `CostService`.

```
User → /routes/calculate
    → routeService.getRoutes()
        → Google Routes API
        → Detect countries (polyline)
        → Return normalized routes[]
    → costService.calculateRouteCost()
        → Load vehicle
        → Fuel cost engine
        → Toll cost engine
        → Sum totals
    ← Return cost object
```

---

# **4. Fuel Cost Engine**

Source: `costService.calculateFuelCost()`


## **4.1 Inputs**

* `distance` (km)
* `vehicle.consumption` (L/100km)
* `vehicle.fuelType` (petrol/diesel/lpg)
* `route.countries[]`
* FuelPrice collection

## **4.2 Fuel price retrieval**

Fuel prices are fetched via:

`fuelPriceService.getFuelPrices(countries, fuelType)`


This method:

* Converts ISO2 → ISO3 country codes
* Normalizes fuel type
* Returns only relevant fuel fields (`gasoline`, `diesel`, `lpg`)

Example returned object:

```json
{
  "countryCode": "DEU",
  "country": "Germany",
  "price": 1.76
}
```

---

## **4.3 Total liters**

```
totalLiters = (distance / 100) * consumption
```

Example:

```
720 km / 100 * 7.5 L = 54 L
```

---

## **4.4 Distance distribution per country**

Current logic uses **equal distribution** based on number of countries:

```
distancePerCountry = distance / countries.length
```

(You may later upgrade this using polyline segmentation.)

---

## **4.5 Per-country liters**

```
liters_i = (distancePerCountry / 100) * consumption
```

---

## **4.6 Per-country cost**

```
cost_i = liters_i * pricePerLiter
```

The breakdown element looks like:

```json
{
  "country": "Poland",
  "countryCode": "POL",
  "pricePerLiter": 1.59,
  "estimatedLiters": 8.2,
  "cost": 13.04
}
```

---

## **4.7 Fuel cost result**

Returned structure:

```json
{
  "total": 42.30,
  "totalLiters": 23.18,
  "breakdown": [ ... ]
}
```

---

# **5. Toll Cost Engine**

The toll engine uses a **hierarchical, multi-source fallback system**.
Source: `tollService.js`


## **5.1 Priority Order**

1. **TollGuru API** (most reliable)
2. **Google TollInfo (estimatedPrice)**
3. **Google leg-level tolls**
4. **Country-based estimation model** (fallback)

---

## **5.2 Step 1 — TollGuru API**

Source: `tollGuruService.js`


### Trigger conditions:

* TollGuru API key exists
* Route has a polyline

### Workflow:

1. Cache hash = SHA-256(polyline)
2. Check TollCache
3. If expired or not found → call API
4. Parse toll breakdown
5. Convert currencies → EUR
6. Save to cache (TTL ≈ 6 months)

Breakdown example:

```json
{
  "name": "AP-7 Toll",
  "cost": 7.20,
  "currency": "EUR",
  "country": "ES"
}
```

---

## **5.3 Step 2 — Google TollInfo**

Used when TollGuru unavailable.

Google format:

```json
{
  "estimatedPrice": [
    { "units": "4", "nanos": 500000000, "currencyCode": "EUR" }
  ]
}
```

Converted via:

```
price = units + nanos / 1e9
```

---

## **5.4 Step 3 — Leg-level tolls**

If some legs contain tolls:

```js
leg.travelAdvisory.tollInfo
```

---

## **5.5 Step 4 — Fallback model**

For Europe, a built-in model covers distance-based and vignette-based tolls.

Examples:

| Country      | Type           | Rule         |
| ------------ | -------------- | ------------ |
| FR           | distance-based | €0.10 per km |
| IT           | distance-based | €0.07 per km |
| AT           | vignette       | €9.60 fixed  |
| CH           | vignette       | €40/year     |
| DE / NL / BE | free           | €0           |

This ensures the system returns **non-zero toll estimates** even where APIs lack data.

---

## **5.6 Toll cost result**

Structure returned:

```json
{
  "total": 12.50,
  "breakdown": [ ... ],
  "source": "tollguru" | "google" | "estimated" | "error"
}
```

---

# **6. Total Cost Calculation**

Source: `calculateRouteCost()`


```
totalCost = fuelCost.total + tollCost.total
```

Result is rounded to 2 decimals.

Returned format:

```json
{
  "fuelCost": { ... },
  "tollCost": { ... },
  "totalCost": 54.80,
  "currency": "EUR"
}
```

---

# **7. Alternative Routes Comparison**

The system evaluates **every alternative route** returned by Google:

For each route:

* distance
* duration
* fuelCost
* tollCost
* totalCost

Then identifies:

* **cheapest route**
* **fastest route**
* **cost difference between fastest vs cheapest**

Method: `compareRoutes()`


Returned structure:

```json
{
  "routes": [...],
  "cheapest": 1,
  "fastest": 0,
  "savings": 14.20
}
```

---

# **8. Error Handling**

Common cases handled:

| Error                 | Cause                   | Behavior                |
| --------------------- | ----------------------- | ----------------------- |
| Missing fuel prices   | Scraper outdated        | Fuel cost = 0           |
| Missing toll info     | No Google/TollGuru data | Uses fallback model     |
| No countries detected | Failed geocode          | Fuel cost = 0, toll = 0 |
| No routes found       | Google error            | 500 response            |

---

# **9. Summary**

The cost-calculation engine integrates:

* Google navigation data
* Fuel prices from EU scraping
* Multi-source toll information
* MongoDB vehicle parameters
* Smart caching layers

It provides a reliable, modular, and extendable pricing system that can be reused across multiple route options and imported routes.

---
