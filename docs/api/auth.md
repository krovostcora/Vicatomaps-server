# Authentication

This document describes the authentication flow and related API endpoints used in the Vicatomaps backend.
Authentication is based on **Firebase ID tokens** and verified using the Firebase Admin SDK.
User identities and profiles are stored in MongoDB.

---

## 1. Overview

Authentication in Vicatomaps uses a hybrid model:

| Component                   | Responsibility                                                 |
|-----------------------------|----------------------------------------------------------------|
| **Firebase ID Token**       | Primary identity provider (Google, Apple, Email/Password etc.) |
| **MongoDB User Record**     | Stores user profile, preferences, metadata                     |
| **Backend Auth Middleware** | Verifies token, resolves user, attaches `req.user`             |

Files involved:

* `src/routes/auth.js`
* `src/middleware/authenticate.js`
* `src/config/firebase.js`
* `src/models/User.js` (implicit from usage)

---

## 2. Authentication Flow

### 2.1 Login / Registration Flow

1. Mobile app obtains Firebase ID token.
2. Sends API request with header:

   ```
   Authorization: Bearer <firebase_id_token>
   ```
3. Backend validates token via Firebase Admin SDK.
4. Backend retrieves or creates MongoDB user record.
5. Backend returns normalized user profile.

### 2.2 Request Authentication

Requests use two modes:

| Middleware     | Purpose                                        |
|----------------|------------------------------------------------|
| `authenticate` | Token required. Rejects if invalid or missing. |
| `optionalAuth` | Token optional. Used for guest requests.       |

---

## 3. API Endpoints

### 3.1 POST /api/auth/register

Registers a new user or updates an existing one based on Firebase UID.

**Headers**

```
Authorization: Bearer <firebase_id_token>
```

**Response**

```json
{
  "success": true,
  "user": { ... },
  "isNewUser": false
}
```

Errors:

* `401`: no token
* `500`: Firebase error or DB error

---

### 3.2 GET /api/auth/me

Returns the authenticated user profile.

**Headers**

```
Authorization: Bearer <firebase_id_token>
```

**Response**

```json
{
  "success": true,
  "user": { ... }
}
```

---

### 3.3 PUT /api/auth/profile

Updates display name and/or user preferences.

**Body example**

```json
{
  "displayName": "Anna",
  "preferences": {
    "language": "en",
    "darkMode": true,
    "defaultVehicleId": "65f123...",
    "measurementSystem": "metric"
  }
}
```

---

### 3.4 DELETE /api/auth/account

Deletes user data from MongoDB.
Firebase account deletion must be done separately on the client side.

---

### 3.5 POST /api/auth/logout

Stateless logout.
Client removes token locally.
(Backend does not maintain sessions.)

---

## 4. User Model

Backend expects the following fields (inferred from usage):

| Field                           | Type     | Description                               |
|---------------------------------|----------|-------------------------------------------|
| `firebaseUid`                   | String   | Unique identifier from Firebase           |
| `email`                         | String   | User email                                |
| `displayName`                   | String   | User display name                         |
| `photoURL`                      | String   | Avatar                                    |
| `provider`                      | String   | Auth provider (google, apple, email etc.) |
| `preferences.language`          | String   | App language                              |
| `preferences.darkMode`          | Boolean  | Theme preference                          |
| `preferences.defaultVehicleId`  | ObjectId | User’s default vehicle                    |
| `preferences.measurementSystem` | String   | Metric/imperial                           |
| `lastLogin`                     | Date     | Updated on each request                   |
| `createdAt` / `updatedAt`       | Date     | Audit fields                              |

---

## 5. Security Notes

* Tokens are validated using Firebase Admin → prevents tampering.
* No backend-issued tokens → no session state.
* Rate limiting applied globally under `/api/*`.
* Sensitive keys come from environment variables.
* Firebase private key is sanitized (`replace(/\\n/g, '\n')`).

---

## 6. Guest Mode Support

Routes that allow guest usage (e.g., `/api/routes/calculate`) use:

```
optionalAuth
```

If no token is provided:

* `req.user = null`
* Route continues normally
* Trip history is **not stored**

---

## 7. Error Handling

Common failures:

| Error                | Cause                                  |
|----------------------|----------------------------------------|
| `TOKEN_EXPIRED`      | Firebase token expired                 |
| `INVALID_TOKEN`      | Wrong or corrupt token                 |
| `401 Unauthorized`   | Missing or malformed header            |
| `404 User not found` | Firebase user exists, but no DB record |
| `500`                | Firebase or database error             |

---

## 8. Example Request

**Request**

```
POST /api/auth/register
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk...
```

**Response**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "65fd12...",
    "email": "someemail@gmail.com",
    "displayName": "Name",
    "preferences": { ... }
  }
}
```
