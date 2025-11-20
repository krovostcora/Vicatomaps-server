// src/services/routeService.js
const axios = require("axios");
const polyline = require("@mapbox/polyline");
const crypto = require("crypto");

const GoogleRouteCache = require("../models/GoogleRouteCache");
const RouteCache = require("../models/RouteCache");

const GOOGLE_ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY;
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

const CACHE_TTL = 1000 * 60 * 60 * 24 * 60; // 2 months

class RouteService {

    // ----------------------------------------------------
    // MAIN ENTRY: GET ROUTES + COUNTRY DETECTION + CACHING
    // ----------------------------------------------------
    async getRoutes({ origin, destination, waypoints = [], alternatives = true }) {
        console.log("\n========== NEW ROUTE REQUEST ==========");

        const cacheKey = this.buildCacheHash(origin, destination, waypoints, alternatives);

        // 1️⃣ Try loading Google result from cache
        const cached = await GoogleRouteCache.findOne({ hash: cacheKey });
        if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL) {
            console.log("⚡ Using cached Google route data");

            // BUT — enrich routes with countries (from RouteCache)
            return await this.attachCountriesToRoutes(cached.data, origin, destination);
        }

        // 2️⃣ Request fresh data from Google Routes API
        const requestBody = this.buildGoogleRequestBody(origin, destination, waypoints, alternatives);

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

        // 3️⃣ Detect countries for each route (uses caching internally)
        await this.detectAndCacheCountries(parsedRoutes, origin, destination);

        // 4️⃣ Save fresh Google routes into cache
        await GoogleRouteCache.updateOne(
            { hash: cacheKey },
            { data: parsedRoutes, updatedAt: new Date() },
            { upsert: true }
        );

        console.log("💾 Saved Google route data to cache");

        return parsedRoutes;
    }

    // ----------------------------------------------------
    // BUILDING GOOGLE REQUEST
    // ----------------------------------------------------
    buildGoogleRequestBody(origin, destination, waypoints, alternatives) {
        const body = {
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
            body.intermediates = waypoints.map(wp => this.buildWaypoint(wp));
        }

        return body;
    }

    buildWaypoint(value) {
        if (!value) return null;
        if (value.lat !== undefined && value.lon !== undefined)
            return { location: { latLng: { latitude: value.lat, longitude: value.lon } } };
        return { address: String(value) };
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
            tollInfo: route.travelAdvisory?.tollInfo || {},
            countries: []   // filled later
        }));
    }

    parseDuration(durationString) {
        return durationString ? parseInt(durationString.replace("s", "")) : 0;
    }

    // ----------------------------------------------------
    // COUNTRY DETECTION & CACHING
    // ----------------------------------------------------

    async detectAndCacheCountries(routes, origin, destination) {
        const o = `${origin.lat},${origin.lon}`;
        const d = `${destination.lat},${destination.lon}`;

        // Try to load from RouteCache
        const cached = await RouteCache.findOne({ origin: o, destination: d });
        if (cached && cached.countries?.length > 0) {
            console.log(`⚡ Loaded countries from cache: ${cached.countries.join(", ")}`);
            routes.forEach(r => r.countries = cached.countries);
            return;
        }

        console.log("🌍 Detecting countries from polyline...");

        // Detect countries using first route's polyline (all routes are similar geographically)
        const poly = routes[0]?.polyline || "";
        const countries = await this.detectCountriesFromPolyline(poly);

        console.log(`🌍 Countries detected: ${countries.join(", ")}`);

        // Save countries into database
        await RouteCache.updateOne(
            { origin: o, destination: d },
            { origin: o, destination: d, countries, updatedAt: new Date() },
            { upsert: true }
        );

        routes.forEach(r => r.countries = countries);
    }

    async attachCountriesToRoutes(routes, origin, destination) {
        const o = `${origin.lat},${origin.lon}`;
        const d = `${destination.lat},${destination.lon}`;

        const cached = await RouteCache.findOne({ origin: o, destination: d });

        if (cached && cached.countries?.length > 0) {
            console.log(`⚡ Loaded countries from cache: ${cached.countries.join(", ")}`);
            routes.forEach(r => (r.countries = cached.countries));
        } else {
            console.log("⚠ Countries not cached — detecting now...");
            await this.detectAndCacheCountries(routes, origin, destination);
        }

        return routes;
    }

    async detectCountriesFromPolyline(encodedPolyline) {
        if (!encodedPolyline) return [];

        const points = polyline.decode(encodedPolyline);
        if (!points.length) return [];

        // sample every 200th point
        const sampled = points.filter((_, i) => i % 200 === 0);
        const countries = new Set();

        for (const [lat, lon] of sampled) {
            try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_ROUTES_API_KEY}&result_type=country`;
                const res = await axios.get(url);

                const country = res?.data?.results?.[0]?.address_components?.[0]?.short_name;
                if (country) countries.add(country);
            } catch (err) {
                console.warn("Reverse geocode failed:", lat, lon);
            }
        }

        return Array.from(countries);
    }

    // ----------------------------------------------------
    // UTILS
    // ----------------------------------------------------

    buildCacheHash(origin, destination, waypoints, alternatives) {
        return crypto.createHash("sha256")
            .update(JSON.stringify({ origin, destination, waypoints, alternatives }))
            .digest("hex");
    }
}

module.exports = new RouteService();
// TODO: Fix Route Countries Cache Inconsistency --