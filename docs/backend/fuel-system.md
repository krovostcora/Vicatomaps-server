# Fuel Price System

This document describes the full fuel price subsystem used in the Vicatomaps backend, including data ingestion, normalization, storage, and runtime lookup for cost calculation.

---

## 1. Overview

Vicatomaps uses live European fuel prices (gasoline, diesel, LPG) to compute country-specific fuel costs for navigation.
Fuel price data is sourced from **tolls.eu**, scraped via Puppeteer, normalized, stored in MongoDB, and consumed by the cost engine.

Components involved:

| Component               | Responsibility                                   |
|-------------------------|--------------------------------------------------|
| **scrapeFuelPrices.js** | Scrapes tolls.eu and writes fresh fuel prices    |
| **FuelPrice model**     | Stores normalized fuel data in MongoDB           |
| **fuelPriceService.js** | Fetches fuel prices for cost calculations        |
| **admin endpoints**     | Manual or cron-triggered updates                 |
| **costService.js**      | Uses normalized prices for fuel cost calculation |

---

## 2. Data Source & Scraping

Fuel prices are scraped from:

```
https://www.tolls.eu/fuel-prices
```

Script: `scripts/scrapeFuelPrices.js`

### Steps:

1. Launch headless Chromium via Puppeteer
2. Load `.table.fuel-prices` table
3. Extract:
    * countryCode (ISO3 from hidden input)
    * country (name)
    * gasoline, diesel, LPG in €
4. Normalize numbers
5. Replace all existing documents in `fuelprices` collection
6. Disconnect cleanly from MongoDB

Example scraped object:

```json
{
  "countryCode": "DEU",
  "country": "Germany",
  "gasoline": 1.76,
  "diesel": 1.63,
  "lpg": 0.89
}
```

---

## 3. Database Model

From `FuelPrice.js` (via database-schema.md)

| Field         | Type   | Description                 |
|---------------|--------|-----------------------------|
| `countryCode` | String | ISO3 country code           |
| `country`     | String | Country name                |
| `gasoline`    | Number | €/L                         |
| `diesel`      | Number | €/L                         |
| `lpg`         | Number | €/L                         |
| `updatedAt`   | Date   | Last scrape time            |
| `createdAt`   | Date   | Auto                        |
| `__v`         | Number | Mongoose version            |

### Important notes:

* Price fields may be `null` if source page lacks data

---

## 4. Admin Endpoints

Source: `src/routes/admin.js`

| Endpoint                 | Method | Description                              |
|--------------------------|--------|------------------------------------------|
| `/api/admin/fuel/update` | POST   | Trigger full scraping & DB overwrite     |
| `/api/admin/fuel/update` | GET    | Browser-friendly version                 |
| `/api/admin/fuel/status` | GET    | Check last update time and country count |

Example response:

```json
{
  "success": true,
  "totalCountries": 31,
  "lastUpdate": "2025-02-10T12:32:11Z"
}
```

---

## 5. Runtime Fuel Price Lookup

Source: `fuelPriceService.js`

This service is used by the cost engine to fetch prices for the specific route countries.

### 5.1 Fuel type normalization

Mapping:

| Input      | Normalized |
|------------|------------|
| `petrol`   | gasoline   |
| `gasoline` | gasoline   |
| `diesel`   | diesel     |
| `lpg`      | lpg        |

### 5.2 Country code normalization

RouteService yields ISO2 codes, which fuelPriceService converts to ISO3 for lookups.

Mapping example:

```
DE → DEU
PL → POL
ES → ESP
FR → FRA
```

---

## 5.3 getFuelPrice(countryCode, fuelType)

Returns **single** price for given country and fuel type.

Example:

```js
const price = await getFuelPrice('DE', 'petrol');
```

### Process:

1. Convert ISO2 → ISO3
2. Normalize fuel type
3. Query FuelPrice collection
4. Return €/L or `null`

---

## 5.4 getFuelPrices(countries[], fuelType)

Fetches fuel prices for multiple countries at once.

Example return dataset:

```json
[
  { "countryCode": "DEU", "country": "Germany", "price": 1.76 },
  { "countryCode": "POL", "country": "Poland", "price": 1.59 }
]
```

Used directly by the cost engine.

---

## 6. Usage Inside Cost Engine

Source: `costService.calculateFuelCost()`

### Full workflow:

1. Get `route.distance`
2. Get `vehicle.consumption`
3. Fetch fuel prices for all countries on route via fuelPriceService
4. Split distance evenly across countries
5. Compute:
   ```
   liters_i = (distance_i / 100) * consumption
   cost_i = liters_i * price_i
   ```
6. Aggregate totals
7. Return breakdown structure

Fuel breakdown example:

```json
{
  "country": "France",
  "countryCode": "FRA",
  "pricePerLiter": 1.93,
  "estimatedLiters": 8.7,
  "cost": 16.80
}
```

---

## 7. Update Frequency

Fuel prices are updated manually or via cron-job automation by running:

```
POST /api/admin/fuel/update
```

or executing:

```
node scripts/scrapeFuelPrices.js
```

Recommended update interval: **every 1–2 weeks**.

---

## 8. Error Handling

| Failure                 | Behavior                        |
|-------------------------|---------------------------------|
| Scraper fails           | No DB update; logs error        |
| Missing country price   | Fuel cost = 0 for that country  |
| Missing route countries | Entire fuel calculation skipped |

The system avoids application-level failure; cost engine always returns valid structure.

---

## 9. Summary

The fuel subsystem provides:

* Automated EU fuel price ingestion
* Clean normalized storage
* Fast per-country runtime lookup
* Fully integrated cost calculation support
* Safe fallbacks for missing data

It is a critical component of the Vicatomaps cost-estimation architecture.

---
