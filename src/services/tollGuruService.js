// services/tollGuruService.js
const axios = require("axios");
const crypto = require("crypto");
const TollCache = require("../models/TollCache");

const TOLLGURU_API_KEY = process.env.TOLLGURU_API_KEY;
const TOLL_TALLY_URL = "https://apis.tollguru.com/toll/v2/complete-polyline-from-mapping-service";

class TollGuruService {
    /**
     * Get toll costs from TollGuru API (with caching)
     */
    async getTollCosts(polyline, vehicleType = "2AxlesAuto") {
        console.log("📍 Polyline sample:", polyline.slice(0, 50), "...");

        if (!TOLLGURU_API_KEY) {
            console.warn("⚠️ TollGuru API key not configured");
            return null;
        }

        // Generate cache key (short hash of polyline)
        const hash = crypto.createHash("sha256").update(polyline).digest("hex");

        // 1️⃣ Try reading from cache (valid 14 days)
        const cached = await TollCache.findOne({ hash });
        if (cached && Date.now() - cached.updatedAt.getTime() < 1000 * 60 * 60 * 24 * 14) {
            console.log("✅ Using cached TollGuru data");
            return cached.data;
        }

        try {
            console.log("💳 Requesting toll data from TollGuru API...");

            const requestBody = {
                source: "google",
                polyline,
                vehicle: { type: vehicleType },
                departure_time: new Date().toISOString(),
            };

            const response = await axios.post(TOLL_TALLY_URL, requestBody, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": TOLLGURU_API_KEY,
                },
                timeout: 30000,
            });

            console.log("✅ TollGuru response received");
            const parsed = this.parseTollTallyResponse(response.data);

            // 2️⃣ Save to cache
            await TollCache.updateOne(
                { hash },
                { data: parsed, updatedAt: new Date() },
                { upsert: true }
            );

            return parsed;
        } catch (error) {
            console.error("❌ Error fetching tolls from TollGuru:");
            console.error("Status:", error.response?.status);
            console.error("Message:", error.message);

            // 3️⃣ Use cached version if available
            if (cached) {
                console.warn("⚠️ Using cached TollGuru data due to error");
                return cached.data;
            }

            return null;
        }
    }

    /**
     * Parse TollGuru (Toll Tally) API response
     */
    parseTollTallyResponse(data) {
        console.log("🔍 Parsing TollGuru response...");

        if (!data || !data.route) {
            console.log("⚠️ No route data in response");
            return null;
        }

        const route = data.route;
        const tolls = route.tolls || [];
        const costs = route.costs || {};

        if (tolls.length === 0) {
            console.log("ℹ️ No tolls on this route");
            return {
                total: 0,
                totalOriginal: 0,
                currency: "EUR",
                breakdown: [],
                source: "tollguru",
            };
        }

        console.log(`📊 Found ${tolls.length} toll(s)`);

        const totalCost = costs.tag || costs.cash || 0;
        const currency = costs.currency || "EUR";

        const breakdown = tolls.map((toll, index) => {
            const tollCost = toll.tagCost || toll.cashCost || 0;
            const tollCurrency = toll.currency || currency;
            return {
                name: toll.name || `Toll ${index + 1}`,
                cost: this.convertToEUR(tollCost, tollCurrency),
                costOriginal: tollCost,
                currency: tollCurrency,
                country: toll.country || "Unknown",
                road: toll.road || "",
                lat: toll.lat,
                lng: toll.lng,
                arrival: toll.arrival,
                description: `${toll.name || "Toll"} - ${toll.road || ""}`,
            };
        });

        const totalEUR = this.convertToEUR(totalCost, currency);

        console.log(`💰 Total toll cost: ${totalCost} ${currency} (≈ €${totalEUR})`);

        return {
            total: totalEUR,
            totalOriginal: totalCost,
            currency,
            breakdown,
            source: "tollguru",
            summary: {
                distance: route.summary?.distance,
                duration: route.summary?.duration,
            },
        };
    }

    /**
     * Convert currency to EUR (approximate)
     */
    convertToEUR(amount, fromCurrency) {
        if (!amount || amount === 0) return 0;
        const exchangeRates = {
            EUR: 1.0,
            USD: 0.92,
            GBP: 1.16,
            CHF: 1.03,
            PLN: 0.23,
            CZK: 0.04,
            SEK: 0.086,
            NOK: 0.087,
            DKK: 0.13,
            HUF: 0.0026,
            RON: 0.20,
            HRK: 0.13,
            RSD: 0.0085,
        };
        const rate = exchangeRates[fromCurrency] || 1.0;
        return parseFloat((amount * rate).toFixed(2));
    }

    isConfigured() {
        return !!TOLLGURU_API_KEY;
    }
}

module.exports = new TollGuruService();
