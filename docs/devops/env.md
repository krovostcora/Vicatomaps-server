# Environment Configuration

This document describes all environment variables required for running and deploying the Vicatomaps backend.
Variables are consumed by the Node.js server, database layer, Firebase, external APIs, and CI/CD workflows.

---

## 1. Core Backend Variables

These variables are required for the backend to start correctly.

| Name          | Required | Scope            | Description                                     |
|---------------|----------|------------------|-------------------------------------------------|
| `NODE_ENV`    | Yes      | Backend          | `development` or `production`                   |
| `PORT`        | No       | Backend          | HTTP port. Defaults to `3000` if not set.       |
| `MONGODB_URI` | Yes      | Backend, scripts | MongoDB connection string for Atlas / local DB. |

`MONGODB_URI` is used by:

- `src/config/database.js` for main app connection
- `scripts/scrapeFuelPrices.js` for scraper DB access
- `scripts/initDatabase.js` via `connectDB()`

---

## 2. Google API Keys

Used for:

- Routes computation
- Toll estimation (Google tollInfo)
- Geocoding for URL parsing

| Name                    | Required | Scope            | Description                              |
|-------------------------|----------|------------------|------------------------------------------|
| `GOOGLE_ROUTES_API_KEY` | Yes      | Backend, scripts | Key for Google Routes API & Geocoding.   |
| `GOOGLE_MAPS_API_KEY`   | No       | Backend          | Optional fallback key for Geocoding API. |

Usage:

- `testGoogleAPI.js` – diagnostics for Routes API
- `googleMapsParser.js` – geocoding place names → coordinates
- `routeService.js` – Routes API + reverse geocoding (via shared key)
- `server.js` – startup logging (`GOOGLE_ROUTES_API_KEY: Loaded/Missing`)

---

## 3. TollGuru API

Used for primary toll cost calculation.

| Name               | Required           | Scope   | Description                           |
|--------------------|--------------------|---------|---------------------------------------|
| `TOLLGURU_API_KEY` | No (feature-gated) | Backend | TollGuru API key for toll estimation. |

If not set:

- Backend logs a warning `"TollGuru API key not configured"`
- Toll system falls back to Google tollInfo or internal EU toll model

`server.js` also logs `TOLLGURU_API_KEY: Loaded/Missing` on startup.

---

## 4. Firebase Admin Configuration

Used for Authentication (Firebase ID tokens) and user identity.

### 4.1 Environment-based configuration

These variables are used in production (Render):

| Name                    | Required | Scope   | Description                            |
|-------------------------|----------|---------|----------------------------------------|
| `FIREBASE_PROJECT_ID`   | Yes      | Backend | Firebase project ID.                   |
| `FIREBASE_CLIENT_EMAIL` | Yes      | Backend | Firebase service account client email. |
| `FIREBASE_PRIVATE_KEY`  | Yes      | Backend | Private key for Firebase Admin SDK.    |

Notes on `FIREBASE_PRIVATE_KEY`:

- Stored as a single-line secret with `\n` escapes
- At runtime, the backend:
  - strips surrounding quotes (if any)
  - replaces `\\n` with real newlines `\n`

### 4.2 File-based fallback (local development)

| Name                            | Required | Scope         | Description                             |
|---------------------------------|----------|---------------|-----------------------------------------|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | No       | Backend (dev) | Path to local `serviceAccountKey.json`. |

If env-based config is missing, `firebase.js` loads credentials from this file path.

---

## 5. Render / CI/CD Related Variables

### 5.1 Render Deployment Hook

Used only inside GitHub Actions.

| Name                 | Required             | Scope | Description                              |
|----------------------|----------------------|-------|------------------------------------------|
| `RENDER_DEPLOY_HOOK` | Yes (GitHub Actions) | CI    | Secret URL to trigger Render deployment. |

Defined as a **GitHub Actions secret**, not in `.env`.

Workflow usage:

```yaml
env:
  RENDER_DEPLOY_HOOK: ${{ secrets.RENDER_DEPLOY_HOOK }}

run: |
  curl -X POST "$RENDER_DEPLOY_HOOK"
```

### 5.2 GitHub Actions environment

Fuel update workflow relies on public API URL only:

- `https://vicatomaps-server.onrender.com/api/health`
- `https://vicatomaps-server.onrender.com/api/admin/fuel/update`

No extra secrets are needed for this workflow (besides backend env already configured on Render).

---

## 6. Scripts Environment

Scripts inherit the same `.env` as the backend.

### 6.1 `scripts/testGoogleAPI.js`

Requires:

- `GOOGLE_ROUTES_API_KEY`

### 6.2 `scripts/scrapeFuelPrices.js`

Requires:

- `MONGODB_URI`

### 6.3 `scripts/initDatabase.js`

Requires:

- `MONGODB_URI` (via `connectDB()`)

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
```

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
