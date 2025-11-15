/**
 * Fuel Price Scraper (axios + cheerio, fully Render Free compatible)
 * Parses fuel prices from https://www.tolls.eu/fuel-prices
 * Saves into MongoDB (FuelPrice model)
 */

require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const FuelPrice = require("../src/models/FuelPrice");

async function scrapeFuelPrices() {
    console.log("⛽ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);

    try {
        console.log("🌍 Fetching HTML from tolls.eu...");
        const response = await axios.get("https://www.tolls.eu/fuel-prices", {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            },
            timeout: 15000,
        });

        const $ = cheerio.load(response.data);

        console.log("🔍 Parsing table rows...");
        const rows = $(".table.fuel-prices .tr").not(".heading");

        const extractEuro = (text) => {
            if (!text) return null;
            const num = text.replace(/[^\d.,]/g, "").replace(",", ".");
            return num ? parseFloat(num) : null;
        };

        const parsed = [];

        rows.each((_, row) => {
            const cells = $(row).find(".td");

            const countryCode = cells.eq(0).find("input").val() || "";
            const country = cells.eq(1).text().trim();

            if (!country) return;

            parsed.push({
                countryCode,
                country,
                gasoline: extractEuro(cells.eq(2).text()),
                diesel: extractEuro(cells.eq(3).text()),
                lpg: extractEuro(cells.eq(4).text()),
            });
        });

        console.log(`✅ Parsed ${parsed.length} countries`);

        if (parsed.length === 0) {
            throw new Error("No prices parsed — structure may have changed");
        }

        console.log("🗑 Clearing old fuel prices...");
        await FuelPrice.deleteMany({});

        console.log("💾 Inserting new fuel prices...");
        await FuelPrice.insertMany(parsed);

        console.log("🎉 Fuel prices saved successfully!");

    } catch (err) {
        console.error("❌ Scraper error:", err.message);
    } finally {
        await mongoose.disconnect().catch(() => {});
        console.log("🔌 MongoDB disconnected");
    }
}

scrapeFuelPrices();
