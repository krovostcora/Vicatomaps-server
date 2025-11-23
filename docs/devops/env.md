# Environment Configuration

This document describes all environment variables required for running and deploying the Vicatomaps backend.  
Variables are consumed by the Node.js server, database layer, Firebase, external APIs, and CI/CD workflows.

---

## 1. Core Backend Variables

These variables are required for the backend to start correctly.

| Name | Required | Scope | Description |
|------|----------|--------|-------------|
| `NODE_ENV` | Yes | Backend | `development` or `production` |
| `PORT` | No | Backend | HTTP port. Defaults to `3000` if not set. :contentReference[oaicite:0]{index=0} |
| `MONGODB_URI` | Yes | Backend, scripts | MongoDB connection string for Atlas / local DB. :contentReference[oaicite:1]{index=1} |

`MONGODB_URI` is used by:

- `src/config/database.js` for main app connection :contentReference[oaicite:2]{index=2}  
- `scripts/scrapeFuelPrices.js` for scraper DB access :contentReference[oaicite:3]{index=3}  
- `scripts/initDatabase.js` via `connectDB()` :contentReference[oaicite:4]{index=4}  

---

## 2. Google API Keys

Used for:

- Routes computation  
- Toll estimation (Google tollInfo)  
- Geocoding for URL parsing  

| Name | Required | Scope | Description |
|------|----------|--------|-------------|
| `GOOGLE_ROUTES_API_KEY` | Yes | Backend, scripts | Key for Google Routes API & Geocoding. :contentReference[oaicite:5]{index=5}:contentReference[oaicite:6]{index=6} |
| `GOOGLE_MAPS_API_KEY` | No | Backend | Optional fallback key for Geocoding API. :contentReference[oaicite:7]{index=7} |

Usage:

- `testGoogleAPI.js` – diagnostics for Routes API :contentReference[oaicite:8]{index=8}  
- `googleMapsParser.js` – geocoding place names → coordinates :contentReference[oaicite:9]{index=9}  
- `routeService.js` – Routes API + reverse geocoding (via shared key) :contentReference[oaicite:10]{index=10}  
- `server.js` – startup logging (`GOOGLE_ROUTES_API_KEY: ✅/❌`) :contentReference[oaicite:11]{index=11}  

---

## 3. TollGuru API

Used for primary toll cost calculation.

| Name | Required | Scope | Description |
|------|----------|--------|-------------|
| `TOLLGURU_API_KEY` | No (feature-gated) | Backend | TollGuru API key for toll estimation. :contentReference[oaicite:12]{index=12} |

If not set:

- Backend logs a warning `"⚠️ TollGuru API key not configured"` :contentReference[oaicite:13]{index=13}  
- Toll system falls back to Google tollInfo or internal EU toll model :contentReference[oaicite:14]{index=14}  

`server.js` also logs `TOLLGURU_API_KEY: ✅/❌` on startup. :contentReference[oaicite:15]{index=15}  

---

## 4. Firebase Admin Configuration

Used for Authentication (Firebase ID tokens) and user identity.

### 4.1 Environment-based configuration

These variables are used in production (Render):

| Name | Required | Scope | Description |
|------|----------|--------|-------------|
| `FIREBASE_PROJECT_ID` | Yes | Backend | Firebase project ID. :contentReference[oaicite:16]{index=16} |
| `FIREBASE_CLIENT_EMAIL` | Yes | Backend | Firebase service account client email. :contentReference[oaicite:17]{index=17} |
| `FIREBASE_PRIVATE_KEY` | Yes | Backend | Private key for Firebase Admin SDK. :contentReference[oaicite:18]{index=18} |

Notes on `FIREBASE_PRIVATE_KEY`:

- Stored as a single-line secret with `\n` escapes  
- At runtime, the backend:
  - strips surrounding quotes (if any)  
  - replaces `\\n` with real newlines `\n` :contentReference[oaicite:19]{index=19}  

### 4.2 File-based fallback (local development)

| Name | Required | Scope | Description |
|------|----------|--------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | No | Backend (dev) | Path to local `serviceAccountKey.json`. :contentReference[oaicite:20]{index=20} |

If env-based config is missing, `firebase.js` loads credentials from this file path. :contentReference[oaicite:21]{index=21}  

---

## 5. Render / CI/CD Related Variables

### 5.1 Render Deployment Hook

Used only inside GitHub Actions.

| Name | Required | Scope | Description |
|------|----------|--------|-------------|
| `RENDER_DEPLOY_HOOK` | Yes (GitHub Actions) | CI | Secret URL to trigger Render deployment. :contentReference[oaicite:22]{index=22} |

Defined as a **GitHub Actions secret**, not in `.env`.

Workflow usage:

```yaml
env:
  RENDER_DEPLOY_HOOK: ${{ secrets.RENDER_DEPLOY_HOOK }}

run: |
  curl -X POST "$RENDER_DEPLOY_HOOK"
``` :contentReference[oaicite:23]{index=23}  

### 5.2 GitHub Actions environment

Fuel update workflow relies on public API URL only:

- `https://vicatomaps-server.onrender.com/api/health`  
- `https://vicatomaps-server.onrender.com/api/admin/fuel/update` :contentReference[oaicite:24]{index=24}  

No extra secrets are needed for this workflow (besides backend env already configured on Render).

---

## 6. Scripts Environment

Scripts inherit the same `.env` as the backend.

### 6.1 `scripts/testGoogleAPI.js`

Requires:

- `GOOGLE_ROUTES_API_KEY` :contentReference[oaicite:25]{index=25}  

### 6.2 `scripts/scrapeFuelPrices.js`

Requires:

- `MONGODB_URI` :contentReference[oaicite:26]{index=26}  

### 6.3 `scripts/initDatabase.js`

Requires:

- `MONGODB_URI` (via `connectDB()`) :contentReference[oaicite:27]{index=27}  

---

## 7. Example `.env` (Local Development)

> **Do not commit `.env` to Git.**  
> Values below are placeholders.

```env
# Environment
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb+srv://user:password@cluster0.mongodb.net/vicatomaps

# Google APIs
GOOGLE_ROUTES_API_KEY=AIzaSyXXXX...
GOOGLE_MAPS_API_KEY=AIzaSyYYYY...

# TollGuru
TOLLGURU_API_KEY=live_tg_key_here

# Firebase (env-based)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional (local dev only)
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json
````

GitHub Actions secret (set in GitHub UI, **not** in `.env`):

* `RENDER_DEPLOY_HOOK=https://api.render.com/deploy/...`

---

## 8. Local vs Production Notes

### Local

* `.env` file loaded via `dotenv` in scripts and backend.
* Firebase can use either env variables or a local service account file.

### Production (Render)

* All variables set via Render Dashboard “Environment” section.
* `NODE_ENV=production`
* Firebase uses env-based credentials (no local JSON).
* GitHub Actions deploy via `RENDER_DEPLOY_HOOK`.

---

## 9. Validation on Startup

On server startup, `server.js` logs whether critical keys are present:

* MongoDB connection status
* `GOOGLE_ROUTES_API_KEY` loaded or missing
* `TOLLGURU_API_KEY` loaded or missing
* Firebase initialized successfully

If `MONGODB_URI` is missing, the app fails fast with an error in `database.js`.

---
