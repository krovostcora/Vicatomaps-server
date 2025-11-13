// src/services/routeService.js
const axios = require("axios");
const polyline = require("@mapbox/polyline");
const crypto = require("crypto");
const GoogleRouteCache = require("../models/GoogleRouteCache");

const GOOGLE_ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY;
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

const CACHE_TTL = 1000 * 60 * 60 * 24 * 60; // 2 months

class RouteService {
    async getRoutes({ origin, destination, waypoints = [], alternatives = true }) {
        console.log("\n========== NEW ROUTE REQUEST ==========");

        // 1️⃣ HASH для кешу (унікальний для O/D/W)
        const hash = crypto.createHash("sha256")
            .update(JSON.stringify({ origin, destination, waypoints, alternatives }))
            .digest("hex");

        // 2️⃣ Перевіряємо кеш
        const cached = await GoogleRouteCache.findOne({ hash });
        if (cached) {
            const age = Date.now() - cached.updatedAt.getTime();

            if (age < CACHE_TTL) {
                console.log("⚡ Using cached Google route data");
                return cached.data;
            } else {
                console.log("⚠ Cached Google route expired — refreshing");
            }
        }

        // 3️⃣ Формуємо запит до Google
        const requestBody = {
            origin: this.buildWaypoint(origin),
            destination: this.buildWaypoint(destination),
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE_OPTIMAL",
            computeAlternativeRoutes: alternatives,
            routeModifiers: {
                avoidTolls: false,
                avoidHighways: false,
                avoidFerries: false,
                vehicleInfo: { emissionType: "GASOLINE" }
            },
            languageCode: "en-US",
            units: "METRIC"
        };

        if (waypoints.length > 0) {
            requestBody.intermediates = waypoints.map(wp => this.buildWaypoint(wp));
        }

        // 4️⃣ Викликаємо Google Routes API
        const response = await axios.post(GOOGLE_ROUTES_URL, requestBody, {
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_ROUTES_API_KEY,
                "X-Goog-FieldMask":
                    "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.travelAdvisory"
            }
        });

        console.log("✅ Google Routes API response received");

        const parsedRoutes = this.parseRoutesResponse(response.data);

        // 5️⃣ Зберігаємо в кеш
        await GoogleRouteCache.updateOne(
            { hash },
            { data: parsedRoutes, updatedAt: new Date() },
            { upsert: true }
        );

        console.log("💾 Saved Google route data to cache");

        return parsedRoutes;
    }

    parseRoutesResponse(data) {
        if (!data.routes || data.routes.length === 0)
            throw new Error("No routes found");

        return data.routes.map((route, index) => ({
            routeIndex: index,
            distance: (route.distanceMeters || 0) / 1000,
            duration: this.parseDuration(route.duration),
            polyline: route.polyline?.encodedPolyline || "",
            legs: route.legs || [],
            tollInfo: route.travelAdvisory?.tollInfo || {}
        }));
    }

    parseDuration(durationString) {
        return durationString ? parseInt(durationString.replace("s", "")) : 0;
    }

    buildWaypoint(value) {
        if (!value) return null;
        if (value.lat !== undefined && value.lon !== undefined)
            return { location: { latLng: { latitude: value.lat, longitude: value.lon } } };
        if (typeof value === "string") return { address: value };
        return { address: String(value) };
    }
}

module.exports = new RouteService();
