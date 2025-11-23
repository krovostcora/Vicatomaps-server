**database-schema.md — Vicatomaps Backend**
===========================================

This document describes all MongoDB collections used by the Vicatomaps backend.The information is based strictly on the current codebase and actual database state.

**1\. FuelPrice**
=================

**Collection:** fuelprices**Model:** FuelPrice.js

Stores fuel price data scraped from tolls.eu.

| Field         | Type          | Description                   |
| ------------- | ------------- | ----------------------------- |
| `countryCode` | String (ISO3) | e.g. `"AUT"`, `"CYP"`         |
| `country`     | String        | Full country name             |
| `gasoline`    | Number        | Price per liter (may be null) |
| `diesel`      | Number        | Price per liter (may be null) |
| `lpg`         | Number        | Price per liter (may be null) |
| `updatedAt`   | Date          | Last scrape time              |
| `createdAt`   | Date          | Auto-generated                |
| `__v`         | Number        | Mongoose version              |


Indexes:

*   countryCode (unique)


**2\. GoogleRouteCache**
========================

**Collection:** googleroutecaches   
**Model:** GoogleRouteCache.js

Caches parsed Google Routes API results, including geometry, distance, toll info and detected countries.

| Field       | Type   | Description                            |
| ----------- | ------ | -------------------------------------- |
| `hash`      | String | SHA-256 hash of route input parameters |
| `data`      | Array  | Parsed Google routes                   |
| `updatedAt` | Date   | Last refresh time                      |


Each data[] item:

| Field        | Type   | Description                    |
| ------------ | ------ | ------------------------------ |
| `routeIndex` | Number | Index inside Google API result |
| `distance`   | Number | Kilometers                     |
| `duration`   | Number | Seconds                        |
| `polyline`   | String | Encoded polyline               |
| `legs`       | Array  | Per-leg details                |
| `tollInfo`   | Object | Toll info from Google          |
| `countries`  | Array  | ISO2 countries on this route   |

Notes
*   Countries ARE stored here (added directly by routeService).

* This is now the primary route cache.

* Completely replaces the need for RouteCache.

* TTL ~60 days managed in routeService.js.

**3\. RouteCache**
==================
This cache is no longer used in Vicatomaps.

**Collection:** routecaches**Model:** RouteCache.js

Caches detected route countries for a specific route.

| Field         | Type           | Description                              |
| ------------- | -------------- | ---------------------------------------- |
| `origin`      | String         | `"lat,lon"` format                       |
| `destination` | String         | `"lat,lon"` format                       |
| `waypoints`   | [String]       | Optional waypoints                       |
| `countries`   | [String]       | Detected ISO2 codes (e.g. `["PL","DE"]`) |
| `polyline`    | String or null | (Currently not used by routeService)     |
| `createdAt`   | Date           | Auto-created, expires in 90 days         |


TTL:

*   createdAt has expires: '90d'


Notes:

*   Some documents contain only 1 country depending on detection results.

*   No polyline is stored in practice.


**4\. TollCache**
=================

**Collection:** tollcaches**Model:** TollCache.js

Stores TollGuru API responses for a given polyline hash.

| Field       | Type   | Description               |
| ----------- | ------ | ------------------------- |
| `hash`      | String | SHA-256 of route polyline |
| `data`      | Object | Parsed TollGuru response  |
| `updatedAt` | Date   | Last update               |


Notes:

*   Used as primary source before calling the TollGuru API again.

*   No TTL configured; expiration handled manually in code (6-month validity logic).


**5\. Vehicle**
===============

**Collection:** vehicles**Model:** Vehicle.js

Predefined vehicle configurations.

| Field         | Type                                    | Description                     |
| ------------- | --------------------------------------- | ------------------------------- |
| `name`        | String                                  | Vehicle name (unique)           |
| `fuelType`    | String (`petrol`, `diesel`, `electric`) | Lowercase                       |
| `consumption` | Number                                  | L/100 km (or kWh/100 km for EV) |
| `tankSize`    | Number                                  | Liters or battery kWh           |
| `description` | String                                  | Optional text                   |
| `createdAt`   | Date                                    | Auto                            |
| `updatedAt`   | Date                                    | Auto                            |


Notes:

*   This collection is used for vehicle selection and cost calculation.

*   Data in Compass matches default vehicles you added (Toyota Hybrid, Audi A4, etc.).


**6\. UserTrip**
================

**Collection:** usertrips**Model:** UserTrip.js

Simplified trip history model used by /api/routes/history.

| Field               | Type               | Description                       |
| ------------------- | ------------------ | --------------------------------- |
| `userId`            | ObjectId → User    | Owner of the trip                 |
| `origin`            | String             | e.g. `"Kaunas, Lithuania"`        |
| `destination`       | String             | e.g. `"Warszawa, Poland"`         |
| `originCoords`      | Object `{lat,lon}` | Coordinates                       |
| `destinationCoords` | Object `{lat,lon}` | Coordinates                       |
| `waypoints`         | [String]           | Optional text waypoints           |
| `vehicle`           | ObjectId → Vehicle | Vehicle used                      |
| `totalCost`         | Number             | EUR                               |
| `totalDistance`     | Number             | In km or meters depending on code |
| `fuelCost`          | Number             | Total fuel cost                   |
| `fuelBreakdown`     | Array              | Per-country breakdown             |
| `tollCost`          | Number             | Toll cost                         |
| `duration`          | Number             | Seconds                           |
| `countries`         | [String]           | ISO2 route countries              |
| `routeData`         | Mixed              | Optional raw route                |
| `notes`             | String             | Future feature                    |
| `isFavorite`        | Boolean            | Default false                     |
| `createdAt`         | Date               | Auto                              |
| `updatedAt`         | Date               | Auto                              |


Notes:

*   This is the active model used for saving trips.

*   Compass screenshot matches exactly the model structure.


**7\. Trip (Legacy Model)**
===========================

**Collection:** trips**Model:** Trip.js

Older version of the trip model, more structured.Used by older /api/trips endpoints.

| Field       | Description                                |
| ----------- | ------------------------------------------ |
| userId      | User reference                             |
| vehicleId   | Vehicle reference                          |
| origin      | `{lat, lon, address}`                      |
| destination | `{lat, lon, address}`                      |
| waypoints   | coordinate-based                           |
| distance    | meters                                     |
| duration    | seconds                                    |
| countries   | array of strings                           |
| fuelCost    | object with totals + per-country breakdown |
| tollCost    | number                                     |
| totalCost   | number                                     |
| currency    | `"EUR"`                                    |
| createdAt   | date                                       |
| notes       | optional                                   |
| isFavorite  | boolean                                    |
| actualCost  | optional manual override                   |


Notes:

*   Still present in DB in some installations.

*   Not used by /api/routes/history.


**8\. User**
============

**Collection:** users**Model:** User.js _(not provided but clear from auth.js)_

Expected fields (from usage in auth):

*   firebaseUid

*   email

*   displayName

*   photoURL

*   provider

*   preferences:

    *   language

    *   darkMode

    *   defaultVehicleId

    *   measurementSystem

*   lastLogin

*   createdAt

*   updatedAt


Used after verifying Firebase token.

**9\. Summary Table**
=====================

| Collection          | Purpose                              |
| ------------------- | ------------------------------------ |
| `fuelprices`        | Fuel price data (scraped)            |
| `googleroutecaches` | Cached Google API route responses    |
| `tollcaches`        | Saved TollGuru results               |
| `vehicles`          | Vehicle definitions                  |
| `usertrips`         | User trip history                    |
| `trips`             | Legacy trip storage                  |
| `users`             | Authenticated users                  |
