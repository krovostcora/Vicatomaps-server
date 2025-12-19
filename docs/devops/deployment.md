# Deployment Guide

This document outlines the full deployment workflow for the Vicatomaps backend, including infrastructure components, environment variables, automated deployment, and scheduled maintenance tasks.

---

## 1. Deployment Architecture Overview

Vicatomaps backend is deployed as a **Node.js application** running on a cloud hosting provider (Render).
Its architecture consists of the following components:

| Component          | Platform                   | Purpose                                     |
|--------------------|----------------------------|---------------------------------------------|
| **Backend Server** | Render                     | Express API server                          |
| **Database**       | MongoDB Atlas              | Stores vehicles, trips, caches, fuel prices |
| **Fuel Scraper**   | GitHub Actions + Puppeteer | Weekly price updates                        |
| **Authentication** | Firebase Admin SDK         | Verifies ID tokens                          |

### High-level diagram

```
GitHub (main branch)
   ↓ push
Render Deploy Hook
   ↓
Render Server
   ↓
MongoDB Atlas
   ↓
GitHub Actions (CRON)
   → fuel scraper → backend → fuelprices collection
```

---

## 2. Environment Configuration

Environment variables are required by:

* MongoDB connection
* Google Routes API
* TollGuru API
* Firebase Admin SDK
* Render deployment hook

### Required Variables

| Variable                        | Description                                |
|---------------------------------|--------------------------------------------|
| `MONGODB_URI`                   | Full MongoDB Atlas connection string       |
| `GOOGLE_ROUTES_API_KEY`         | Key for Google Routes & Geocoding          |
| `GOOGLE_MAPS_API_KEY`           | Alternative key for geocoding fallback     |
| `TOLLGURU_API_KEY`              | TollGuru toll estimation API key           |
| `FIREBASE_PROJECT_ID`           | Firebase project identifier                |
| `FIREBASE_CLIENT_EMAIL`         | Firebase admin email                       |
| `FIREBASE_PRIVATE_KEY`          | Private key (must replace `\\n` with `\n`) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Optional fallback for local dev            |
| `RENDER_DEPLOY_HOOK`            | Secret URL for triggering deployments      |
| `NODE_ENV`                      | `production` or `development`              |

These variables are required by:

* `src/config/database.js`
* `src/config/firebase.js`
* `server.js` for launch-time validation and logging

---

## 3. Deployment Pipeline (Automatic)

The backend auto-deploys when changes are pushed to `main`.

### Workflow File

`.github/workflows/render-deploy.yml`

### Trigger

```yml
on:
  push:
    branches: [ "main" ]
```

### Action

```
curl -X POST "$RENDER_DEPLOY_HOOK"
```

Render listens to this webhook and initiates a full deployment:

1. Pull latest code
2. Install dependencies (`npm install`)
3. Start server (`node server.js`)
4. Output environment logs (API keys loaded or missing)

Deployment is fully automated; no manual steps required.

---

## 4. Manual Deployment (Local → Render)

If needed, deploy manually via Render Dashboard:

1. Connect GitHub repository
2. Set environment variables
3. Choose Node version (LTS recommended)
4. Set build command:

   ```
   npm install
   ```
5. Set start command:

   ```
   node server.js
   ```
6. Deploy

---

## 5. Database Deployment

MongoDB is hosted on **MongoDB Atlas**.
Connection is initialized via:

`connectDB()` → `src/config/database.js`

### Deployment requirements:

* Whitelisted IP for Render outbound traffic
* Stable connection over TLS
* Proper indexes (`_id`, TTL for cache collections)

No migrations are required; Mongoose handles schemas automatically.

---

## 6. Production Server Behavior

During startup, `server.js`:

1. Loads environment variables
2. Connects to MongoDB
3. Initializes Firebase SDK
4. Sets security middleware (helmet, CORS, rate limiter)
5. Loads all API routes
6. Logs which API keys were loaded

Source: `server.js`

Rate limiting:

```
100 requests / 15 minutes
```

This protects against basic DDoS and brute-force attempts.

---

## 7. Scheduled Maintenance (CRON Automation)

Fuel prices are updated weekly using a GitHub Actions workflow.

### Workflow File

`.github/workflows/update-fuel-prices.yml`

### Schedule

```
Every Sunday at 12:06 UTC
```

### Steps:

1. Wake Render server
2. Call `/api/admin/fuel/update`
3. Verify update with `/api/admin/fuel/status`

This ensures fuel prices stay up to date without manual intervention.

---

## 8. Rendering + Uptime Considerations

Because Render’s free tier sleeps after inactivity, the GitHub workflow performs:

```
curl https://vicatomaps-server.onrender.com/api/health
sleep 60
```

This guarantees:

* Server is awake before executing scraper
* Scraper endpoint works reliably

---

## 9. Logging & Monitoring

The server logs:

* timestamps
* HTTP methods + routes
* errors (500 handler)
* missing API keys
* Firebase initialization state

Rendering and troubleshooting tools:

* Render dashboard logs
* GitHub Actions logs
* MongoDB Atlas performance monitor

---

## 10. Failure Recovery

| Failure                         | Behavior                    | Resolution                   |
|---------------------------------|-----------------------------|------------------------------|
| Render cannot pull latest build | Webhook error               | Re-trigger deployment        |
| Fuel scraper fails              | Workflow reports failure    | Fix scraper or page selector |
| MongoDB down                    | Server exits                | Restore Atlas or reconnect   |
| Missing API key                 | Startup logs show "Missing" | Add key in Render env        |
| Firebase key misformatted       | Token verification fails    | Replace `\\n` with `\n`      |

---

## 11. Local Development Workflow

For local development:

```
npm install
npm run dev   // nodemon server.js
```

Requires `.env` with:

* local MongoDB cluster URI
* Google API keys
* TollGuru API key
* Firebase service account JSON

---

## 12. Summary

Vicatomaps backend uses a clean, automated deployment architecture:

* Automatic deploy on push to `main`
* Weekly fuel scraper automation
* Cloud-native hosting (Render)
* Scalable & fault-tolerant MongoDB Atlas
* Fully environment-driven configuration
* Zero-downtime deployments via webhook

This ensures continuous updates, low maintenance overhead, and predictable production behavior.

---
