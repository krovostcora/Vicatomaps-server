// services/routeService.js
const axios = require("axios");

// ===============================
// CONFIG
// ===============================
const GOOGLE_ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY;
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

// Pretty logging
function logHeader(title) {
    console.log("\n================== " + title + " ==================\n");
}

// ===============================
// HELPERS
// ===============================

// Parse "lat,lng" -> { latitude, longitude }
function parseLatLng(str) {
    const [lat, lng] = str.split(",").map(v => parseFloat(v.trim()));
    return { latitude: lat, longitude: lng };
}

// Detect if string is "lat,lng"
function isLatLng(str) {
    return /^[\d\.\-]+,\s*[\d\.\-]+$/.test(str);
}

// Build Google Routes API waypoint (address or latLng)
function buildWaypoint(value) {
    if (!value) return null;
    if (isLatLng(value)) {
        return { location: { latLng: parseLatLng(value) } };
    }
    return { address: value };
}

// Parse duration inside Google API ("1234s" → 1234)
function parseDuration(str) {
    if (!str) return 0;
    return parseInt(str.replace("s", ""));
}

// Try to extract country from address text
function extractCountryFromAddressText(text) {
    if (!text) return null;

    const COUNTRY_MAP = {
        "Ukraine": "UA",
        "Україна": "UA",
        "Poland": "PL",
        "Polska": "PL",
        "Germany": "DE",
        "Deutschland": "DE",
        "France": "FR",
        "Czech Republic": "CZ",
        "Czechia": "CZ",
        "Spain": "ES",
        "Italia": "IT",
        "Italy": "IT",
        "Portugal": "PT",
        "Lithuania": "LT",
        "Lietuva": "LT",
        "Latvia": "LV",
        "Estonia": "EE",
        "Netherlands": "NL",
        "Belgium": "BE",
        "Switzerland": "CH",
        "Austria": "AT",
        "Slovakia": "SK",
        "Hungary": "HU",
        "Romania": "RO",
        "Bulgaria": "BG",
        "Greece": "GR",
        "USA": "US",
        "United States": "US",
        "Canada": "CA"
    };

    for (const key of Object.keys(COUNTRY_MAP)) {
        if (text.includes(key)) return COUNTRY_MAP[key];
    }
    return null;
}

// Extract countries from route legs
function extractCountriesFromLegs(legs) {
    const countries = new Set();

    legs?.forEach(leg => {
        if (!leg.startLocation?.address && !leg.endLocation?.address) return;

        const startCountry = extractCountryFromAddressText(leg.startLocation?.address || "");
        const endCountry = extractCountryFromAddressText(leg.endLocation?.address || "");

        if (startCountry) countries.add(startCountry);
        if (endCountry) countries.add(endCountry);
    });

    return Array.from(countries);
}

// Extract countries from origin/destination
function extractCountriesFromRawAddresses(addressList) {
    const countries = new Set();

    addressList.forEach(addr => {
        const c = extractCountryFromAddressText(addr);
        if (c) countries.add(c);
    });

    return Array.from(countries);
}


// ===============================
// MAIN SERVICE CLASS
// ===============================
class RouteService {
    // ------------------------------------------------
    // ✅ GET ROUTES (with alternatives, tolls, legs, etc)
    // ------------------------------------------------
    async getRoutes({ origin, destination, waypoints = [], alternatives = true }) {
        logHeader("NEW ROUTE REQUEST");

        console.log("Origin:", origin);
        console.log("Destination:", destination);
        console.log("Waypoints:", waypoints);

        try {
            const requestBody = {
                origin: buildWaypoint(origin),
                destination: buildWaypoint(destination),
                travelMode: "DRIVE",
                routingPreference: "TRAFFIC_AWARE_OPTIMAL",
                computeAlternativeRoutes: alternatives,
                extraComputations: ["TOLLS"],
                routeModifiers: {
                    avoidTolls: false,
                    avoidHighways: false,
                    avoidFerries: false,
                    vehicleInfo: { emissionType: "GASOLINE" }
                },
                languageCode: "en-US",
                units: "METRIC"
            };

            // Add waypoints
            if (waypoints.length > 0) {
                requestBody.intermediates = waypoints.map(buildWaypoint);
            }

            // Request to Google API
            const response = await axios.post(GOOGLE_ROUTES_URL, requestBody, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_ROUTES_API_KEY,
                    "X-Goog-FieldMask":
                        "routes.distanceMeters,routes.duration," +
                        "routes.polyline.encodedPolyline,routes.legs," +
                        "routes.travelAdvisory.tollInfo," +
                        "routes.legs.travelAdvisory.tollInfo"
                }
            });

            // Parse countries
            const inputCountries = extractCountriesFromRawAddresses([origin, destination, ...waypoints]);

            return this.parseRoutesResponse(response.data, inputCountries);

        } catch (err) {
            console.error("Error fetching routes:", err.response?.data || err.message);
            throw new Error("Failed to fetch routes from Google Routes API");
        }
    }


    // ------------------------------------------------
    // ✅ GET TURN-BY-TURN DIRECTIONS
    // ------------------------------------------------
    async getDirections({ origin, destination, waypoints = [] }) {
        logHeader("NEW DIRECTIONS REQUEST");

        try {
            const requestBody = {
                origin: buildWaypoint(origin),
                destination: buildWaypoint(destination),
                travelMode: "DRIVE",
                languageCode: "en-US",
                units: "METRIC"
            };

            if (waypoints.length > 0) {
                requestBody.intermediates = waypoints.map(buildWaypoint);
            }

            const response = await axios.post(GOOGLE_ROUTES_URL, requestBody, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_ROUTES_API_KEY,
                    "X-Goog-FieldMask":
                        "routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction," +
                        "routes.legs.steps.polyline.encodedPolyline,routes.legs.steps.distanceMeters," +
                        "routes.legs.steps.staticDuration,routes.distanceMeters,routes.duration"
                }
            });

            return this.parseDirectionsResponse(response.data);

        } catch (err) {
            console.error("Error fetching directions:", err.response?.data || err.message);
            throw new Error("Failed to fetch directions from Google Routes API");
        }
    }


    // ------------------------------------------------
    // ✅ PARSE ROUTES RESPONSE
    // ------------------------------------------------
    parseRoutesResponse(data, preDetectedCountries = []) {
        if (!data.routes || data.routes.length === 0) {
            throw new Error("No routes found");
        }

        return data.routes.map((route, index) => {
            const legs = route.legs || [];

            const countries =
                preDetectedCountries.length > 0
                    ? preDetectedCountries
                    : extractCountriesFromLegs(legs);

            const tollInfo = route.travelAdvisory?.tollInfo || {};

            return {
                routeIndex: index,
                distanceKm: (route.distanceMeters || 0) / 1000,
                durationSec: parseDuration(route.duration),
                polyline: route.polyline?.encodedPolyline || "",
                legs: legs,
                tollInfo,
                countries
            };
        });
    }


    // ------------------------------------------------
    // ✅ PARSE DIRECTIONS RESPONSE (step-by-step)
    // ------------------------------------------------
    parseDirectionsResponse(data) {
        if (!data.routes || data.routes.length === 0) {
            throw new Error("No directions found");
        }

        const route = data.routes[0];
        const steps = [];

        route.legs?.forEach(leg => {
            leg.steps?.forEach(step => {
                steps.push({
                    instruction: step.navigationInstruction?.instructions || "",
                    distanceKm: (step.distanceMeters || 0) / 1000,
                    durationSec: parseDuration(step.staticDuration),
                    polyline: step.polyline?.encodedPolyline || ""
                });
            });
        });

        return {
            totalDistanceKm: (route.distanceMeters || 0) / 1000,
            totalDurationSec: parseDuration(route.duration),
            polyline: route.polyline?.encodedPolyline || "",
            steps
        };
    }
}

module.exports = new RouteService();
