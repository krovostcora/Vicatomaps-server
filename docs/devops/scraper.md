# **Fuel Price Scraper System**

This document describes the fuel price scraping pipeline used in Vicatomaps.
The scraper retrieves European fuel prices from **tolls.eu**, normalizes the dataset, stores it into MongoDB, and exposes an admin API endpoint to trigger updates manually or via scheduled automation.

---

# **1. Overview**

The scraper is a standalone Node.js script that:

1. Launches a **headless Chromium browser** via Puppeteer
2. Loads the **tolls.eu/fuel-prices** page
3. Extracts fuel price data for all supported countries
4. Normalizes values (remove currency symbols, parse numbers)
5. Replaces all existing documents in the `fuelprices` collection
6. Closes the database connection cleanly

Updates are triggered:

* manually through `/api/admin/fuel/update`
* automatically via a scheduled GitHub Action

---

# **2. Scraper Script**

Source: `scripts/scrapeFuelPrices.js`


### **2.1 Workflow**

```
Start script
   ↓
Connect to MongoDB
   ↓
Launch Puppeteer (headless Chrome)
   ↓
Load tolls.eu/fuel-prices
   ↓
Parse table rows
   ↓
Extract fuel prices (€, gasoline/diesel/LPG)
   ↓
Normalize values
   ↓
Replace database contents
   ↓
Disconnect + close browser
```

### **2.2 Extracted fields**

| Field         | Description                      |
| ------------- | -------------------------------- |
| `countryCode` | ISO2 from hidden input `<input>` |
| `country`     | Country name                     |
| `gasoline`    | Price of petrol (€/L)            |
| `diesel`      | Price of diesel (€/L)            |
| `lpg`         | Price of LPG (€/L)               |

### **2.3 Parsing Logic**

The scraper matches prices using:

```
/€\s*([\d.,]+)/
```

Values are sanitized:

* commas → dots
* missing entries → null
* countryCode converted automatically by backend later (ISO2→ISO3)

### **2.4 Database Update Strategy**

```
FuelPrice.deleteMany({})
FuelPrice.insertMany(data)
```

A complete dataset rewrite is intentional:

* guarantees consistency
* avoids duplicate or stale data
* ensures fixed schema

---

# **3. Admin API Integration**

Source: `src/routes/admin.js`


### **3.1 `/api/admin/fuel/update`**

Triggers the scraper.

**GET** and **POST** versions exist for convenience.

Response example:

```json
{
  "success": true,
  "message": "Fuel prices updated",
  "totalCountries": 31
}
```

### **3.2 `/api/admin/fuel/status`**

Returns last update time and number of countries.

---

# **4. Scheduled Automation (GitHub Actions)**

Fuel prices are updated weekly using a GitHub Actions workflow.

Source: `.github/workflows/update-fuel-prices.yml`


### **4.1 Schedule**

```
Every Sunday at 12:06 UTC
```

Cron:

```
6 12 * * 0
```

### **4.2 Workflow Summary**

#### Step 1 — Wake up Render server

Ensures Render dyno is running:

```sh
curl -X GET https://vicatomaps-server.onrender.com/api/health
sleep 60
```

#### Step 2 — Trigger scraper

```sh
curl -X GET https://vicatomaps-server.onrender.com/api/admin/fuel/update
```

If HTTP ≠ 200 → workflow fails.

#### Step 3 — Verify status

```sh
curl -X GET https://vicatomaps-server.onrender.com/api/admin/fuel/status
```

### **Why wake-up step?**

Render free tier spins down → scraper endpoint unreachable.
The workflow ensures startup before performing critical operations.

---

# **5. Fault Tolerance & Recovery**

| Issue                  | Behavior                               |
| ---------------------- | -------------------------------------- |
| Puppeteer crash        | Script logs error; DB unchanged        |
| Website layout changed | Prices become null; admin sees failure |
| MongoDB unreachable    | Script stops with a fatal error        |
| Render sleeping        | Workflow wakes it up                   |
| HTTP 5xx during update | GitHub Action fails (visible in logs)  |

---

# **6. Data Usage in Cost Engine**

Fuel prices from the scraper feed directly into:

* `fuelPriceService` → `getFuelPrices()`
* `costService` → `calculateFuelCost()`

This enables:

* per-country fuel cost
* realistic total cost calculation
* up-to-date pricing (weekly refresh)

---

# **7. Summary**

The scraper system provides:

* Fully automated weekly updates
* Accurate EU-wide fuel price dataset
* Seamless integration with admin endpoints
* Efficient Puppeteer-based extraction
* Deterministic DB rewrite for consistency
* Fault-tolerant GitHub Action workflow

It is a critical component of the Vicatomaps pricing architecture.

---
