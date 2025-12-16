
# 🛢️ Fuel Price Calculation System  
> **VicatOMaps Backend — Fuel & Route Cost Computation**

This module handles **fuel price management and trip cost estimation**.  
It automatically scrapes fuel data from *tolls.eu*, stores it in MongoDB,  
and uses it to calculate the fuel cost of a route based on countries crossed.

---

## 🧩 Architecture Overview

```
tolls.eu  
↓  
scrapeFuelPrices.js   
↓   
MongoDB (FuelPrice)  
↓  
fuelPriceService.js  
↓  
costService.js  
↓  
routeService.js → Google Routes API  
````

----------

## ⚙️ Components

### 1. `scripts/scrapeFuelPrices.js`
Scrapes live fuel prices from **https://www.tolls.eu/fuel-prices** using Puppeteer.

**Flow:**
1. Opens the fuel prices table on tolls.eu  
2. Extracts all rows, keeping only euro (€) prices  
3. Saves data like:
   ```js
   {
     countryCode: "DEU",
     country: "Germany",
     gasoline: 1.73,
     diesel: 1.64,
     lpg: 1.01
   }
   ```

4. Replaces old entries in MongoDB with new data.

---

### 2. `models/FuelPrice.js`

Defines MongoDB schema for fuel prices:

```js
{
  countryCode: String, // ISO-3 code (DEU, POL, FRA)
  country: String,
  gasoline: Number, // petrol (gasoline)
  diesel: Number,   // diesel fuel
  lpg: Number,      // liquefied petroleum gas
  updatedAt: Date
}
```

---

### 3. `services/fuelPriceService.js`

Handles fetching fuel price data from MongoDB.

**Core functions:**

```js
getFuelPrices(countries, fuelType)
getFuelPrice(countryCode, fuelType)
```

**Logic:**

* Converts ISO-2 → ISO-3 country codes (`PL` → `POL`, etc.)
* Maps vehicle fuel types:

  ```js
  petrol → gasoline
  gasoline → gasoline
  diesel → diesel
  lpg → lpg
  ```
* Returns a list of countries with their corresponding price:

  ```js
  [
    { countryCode: "POL", country: "Poland", price: 1.40 },
    { countryCode: "DEU", country: "Germany", price: 1.73 },
    { countryCode: "FRA", country: "France", price: 1.71 },
    { countryCode: "ESP", country: "Spain", price: 1.48 },
    { countryCode: "PRT", country: "Portugal", price: 1.71 }
  ]
  ```

---

### 4. `services/routeService.js`

Responsible for route generation and country detection.

**APIs used:**

* `Google Routes API` → retrieves route geometry (polyline)
* `Google Geocoding API` → detects countries along the route

**Algorithm:**

1. Decode route polyline to coordinate points
2. Sample every ~200th point to reduce API load
3. Reverse geocode each point:

   ```bash
   https://maps.googleapis.com/maps/api/geocode/json?latlng=<LAT>,<LON>&result_type=country
   ```
4. Extract country ISO code (`PL`, `DE`, `FR`, `ES`, `PT`)
5. Return a unique array of countries for the route.

✅ Uses your existing `GOOGLE_ROUTES_API_KEY`
✅ Within free tier (~500 requests/month)

---

### 5. `services/costService.js`

Handles full **trip cost calculation**, including fuel and tolls.

**Steps:**

1. Fetch vehicle info (`fuelType`, `consumption`)
2. Get route and country list
3. Fetch prices from `fuelPriceService`
4. Compute:

    * total liters used
    * liters per country
    * cost per country
5. Return structured breakdown:

   ```json
   {
     "fuelCost": {
       "total": 396.82,
       "totalLiters": 248.79,
       "breakdown": [
         {"country": "Poland", "pricePerLiter": 1.40, "liters": 41.46, "cost": 58.04},
         {"country": "Germany", "pricePerLiter": 1.73, "liters": 41.46, "cost": 71.73},
         {"country": "France", "pricePerLiter": 1.71, "liters": 41.46, "cost": 70.90},
         {"country": "Spain", "pricePerLiter": 1.48, "liters": 41.46, "cost": 61.36},
         {"country": "Portugal", "pricePerLiter": 1.71, "liters": 41.46, "cost": 70.90}
       ]
     }
   }
   ```

---

## 🧮 Formulas

| Metric                 | Formula                                             | Description                   |
| ---------------------- | --------------------------------------------------- | ----------------------------- |
| **Total liters**       | `(distance / 100) * consumption`                    | overall fuel usage            |
| **Liters per country** | `(distance / countries.length) / 100 * consumption` | approximate usage per country |
| **Cost per country**   | `liters * pricePerLiter`                            | cost per segment              |
| **Total cost**         | `Σ(cost[i])`                                        | total sum                     |

---

## 🧭 End-to-End Flow

```
1️⃣ User sends /api/routes/calculate
2️⃣ Google Routes API returns route geometry
3️⃣ routeService detects countries on route
4️⃣ costService fetches fuel prices
5️⃣ costService calculates liters & cost per country
6️⃣ API returns total and breakdown
```

---

## 🧠 Fuel Type Reference

| Fuel Type  | DB Field          | Description               |
| ---------- | ----------------- | ------------------------- |
| `gasoline` | petrol / gasoline | Regular car fuel (бензин) |
| `diesel`   | diesel            | Diesel (солярка)          |
| `lpg`      | liquefied gas     | Autogas (пропан-бутан)    |

---

## ⚙️ Optimization & Production Notes

* Cache detected countries in `RouteCache` to minimize API calls.
* Avoid scraping tolls.eu more than once per day.
* For long routes, sample every 300–400 points.
* Google API free limit: **~500 requests/month** is usually enough.
* Enable billing on Google Cloud to keep free-tier active.

---

## 🚀 Local Usage

```bash
# 1. Scrape fresh fuel prices
npm run scrape:fuel

# 2. Run the backend
npm run dev

# 3. Calculate trip cost
curl -X POST http://localhost:3000/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 52.2297, "lon": 21.0122},
    "destination": {"lat": 38.7223, "lon": -9.1393},
    "vehicleId": "YOUR_VEHICLE_ID"
  }'
```

---

## 📦 Example Response

```json
{
  "fuelCost": {
    "total": 397.17,
    "totalLiters": 249.0,
    "breakdown": [
      {"country": "POL", "pricePerLiter": 1.40, "liters": 41.4, "cost": 58.0},
      {"country": "DEU", "pricePerLiter": 1.73, "liters": 41.4, "cost": 71.6},
      {"country": "FRA", "pricePerLiter": 1.71, "liters": 41.4, "cost": 70.8},
      {"country": "ESP", "pricePerLiter": 1.48, "liters": 41.4, "cost": 61.2},
      {"country": "PRT", "pricePerLiter": 1.71, "liters": 41.4, "cost": 70.8}
    ]
  },
  "totalCost": 397.17,
  "currency": "EUR"
}
```
