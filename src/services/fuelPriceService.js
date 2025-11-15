/**
 * Fuel Price Scraper (tolls.eu)
 * Fast, stable, Render-Free compatible (axios + cheerio)
 */

const axios = require("axios");
const cheerio = require("cheerio");
const FuelPrice = require("../models/FuelPrice");

/**
 * Scrape fuel prices from https://www.tolls.eu/fuel-prices
 * Returns parsed array and saves into MongoDB
 */
async function scrapeFuelPrices() {
    console.log("⛽ Starting fuel price scrape from tolls.eu ...");

    try {
        // Fetch HTML from the website
        const response = await axios.get("https://www.tolls.eu/fuel-prices", {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            },
            timeout: 15000,
        });

        const $ = cheerio.load(response.data);

        console.log("🔍 Parsing fuel price table...");
        const rows = $(".table.fuel-prices .tr").not(".heading");

        const extractEuro = (text) => {
            if (!text) return null;
            const cleaned = text.replace(/[^\d.,]/g, "").replace(",", ".");
            return cleaned ? parseFloat(cleaned) : null;
        };

        const parsed = [];

        rows.each((_, row) => {
            const cells = $(row).find(".td");

            const countryCode = cells.eq(0).find("input").val()?.trim() || "";
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
            throw new Error("No fuel prices parsed — table structure may have changed.");
        }

        // Save into DB
        console.log("🗑 Clearing old prices...");
        await FuelPrice.deleteMany({});

        console.log("💾 Inserting new prices...");
        await FuelPrice.insertMany(parsed);

        console.log("🎉 Fuel prices saved successfully!");
        return parsed;

    } catch (err) {
        console.error("❌ Fuel price scraping failed:", err.message);
        throw err;
    }
}

module.exports = { scrapeFuelPrices };
