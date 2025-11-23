# **Toll System**

This document describes the toll computation subsystem used in the Vicatomaps backend.
The system aggregates toll data from multiple sources, applies caching, and provides a unified toll cost calculation for each route.

---

# **1. Overview**

The toll subsystem uses a **hierarchical multi-source architecture**:

| Priority | Source                             | Description                    |
| -------- | ---------------------------------- | ------------------------------ |
| **1**    | TollGuru API                       | Primary external toll source   |
| **2**    | Google Routes API (estimatedPrice) | Toll estimates when available  |
| **3**    | Google leg-level tollInfo          | Per-segment advisory           |
| **4**    | Internal EU fallback model         | Country-based estimation rules |

All toll results are normalized into EUR and cached for performance.

---

# **2. Components**

| File                  | Responsibility                                       |
| --------------------- | ---------------------------------------------------- |
| `tollService.js`      | Main orchestrator, fallback logic, breakdown merging |
| `tollGuruService.js`  | TollGuru API client + caching                        |
| `GoogleRouteCache.js` | May contain Google tollInfo parsed from routeService |
| `RouteService`        | Provides parsed tollInfo objects from Google         |

---

# **3. Toll Calculation Flow**

Below is the exact flow implemented in `tollService.js`:

```
calculateTolls(route)
   ↓
check TollGuru (if polyline exists)
   ↓ (fallback if API error)
check Google estimatedPrice
   ↓ (fallback)
check per-leg tollInfo
   ↓ (fallback)
apply country-based EU toll model
   ↓
aggregate breakdown
return { total, breakdown, source }
```

---

# **4. TollGuru API Integration**

Source: `tollGuruService.js`


### **4.1 When TollGuru is used**

* A valid `TOLLGURU_API_KEY` exists
* The route contains a polyline
* No valid cached result exists (or TTL expired)

### **4.2 Request**

The service sends the polyline encoded in Google format.

### **4.3 Caching**

Cache key:

```
hash = SHA256(polyline)
```

Stored in `TollCache` with TTL ≈ **6 months**.

### **4.4 Response Normalization**

* Extract toll cost
* Convert all prices to **EUR**
* Attach country-level breakdown where provided
* Mark source as `"tollguru"`

### Example:

```json
{
  "name": "AP-7 Toll",
  "cost": 7.20,
  "country": "ES",
  "currency": "EUR"
}
```

---

# **5. Google Estimated Toll Price**

If TollGuru is unavailable or returns an error, the system attempts Google's own aggregated toll estimate.

Source: parsed in `routeService.js`


### Format:

```json
{
  "estimatedPrice": [
    { "units": "4", "nanos": 500000000, "currencyCode": "EUR" }
  ]
}
```

### Conversion:

```
price = units + nanos / 1e9
```

If present, this source is marked:

```
source: "google_estimated"
```

---

# **6. Google Leg-Level TollInfo**

If aggregated estimated price is missing, Vicatomaps looks for tolls per leg:

```
leg.travelAdvisory.tollInfo
```

Typical usage:

* U.S. data
* Canada
* Certain non-EU regions

Marked as:

```
source: "google_legs"
```

---

# **7. EU Fallback Toll Model**

When neither TollGuru nor Google provides toll data, the system applies a deterministic estimation model.
Implemented in: `tollService.js`


### Country rules:

| Country              | Type           | Rule            |
| -------------------- | -------------- | --------------- |
| **France (FR)**      | distance-based | €0.10 per km    |
| **Italy (IT)**       | distance-based | €0.07 per km    |
| **Spain (ES)**       | distance-based | €0.09 per km    |
| **Austria (AT)**     | vignette       | €9.60 fixed     |
| **Switzerland (CH)** | vignette       | €40/year        |
| **Slovakia (SK)**    | vignette       | €12.50 (10-day) |
| **Slovenia (SI)**    | vignette       | €16.00 (week)   |
| **Czechia (CZ)**     | vignette       | €12.00 (10-day) |
| **Germany, NL, BE**  | free           | €0              |

### Behavior:

* Distance-based countries compute:

  ```
  cost = distanceInCountry * perKmRate
  ```
* Vignette countries add a fixed cost once
* Free countries return cost = 0

Source marked:

```
source: "fallback_model"
```

Breakdown example:

```json
{
  "country": "FR",
  "type": "distance-based",
  "cost": 12.40
}
```

---

# **8. Toll Breakdown Format**

Every toll result is normalized to:

```json
{
  "country": "ES",
  "name": "AP-7 Toll",
  "type": "distance-based" | "vignette" | "api" | "google",
  "cost": 7.20,
  "currency": "EUR"
}
```

Final combined result example:

```json
{
  "total": 12.50,
  "breakdown": [
    { "country": "ES", "cost": 7.20 },
    { "country": "FR", "cost": 5.30 }
  ],
  "source": "tollguru"
}
```

---

# **9. Error Handling**

| Error                        | Behavior                       |
| ---------------------------- | ------------------------------ |
| TollGuru API timeout         | Skip to Google estimated price |
| No Google tollInfo           | Skip to fallback model         |
| Missing distance per country | Assume equal distribution      |
| Invalid polyline             | Skip TollGuru, skip Google     |

The system **always returns a toll structure**, even with limited data.

---

# **10. Summary**

The toll subsystem is designed to be:

* **Resilient**: four independent data sources
* **Cost-efficient**: uses caching for all external calls
* **EU-aware**: includes detailed fallback toll logic
* **API-first**: integrates tightly with Google and TollGuru
* **Deterministic**: always returns a valid toll cost

This makes it reliable even for long multi-country European routes.

