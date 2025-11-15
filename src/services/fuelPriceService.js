/**
 * Unified Fuel Price Service
 * - Scrapes tolls.eu
 * - Saves to MongoDB
 * - Provides getFuelPrices() and getFuelPriceForCountry()
 */

const axios = require("axios");
const cheerio = require("cheerio");
const FuelPrice = require("../models/FuelPrice");

// -----------------------------
// SCRAPER (used by cron + admin)
// -----------------------------
async function scrapeFuelPrices() {
  console.log("⛽ Scraping fuel prices from tolls.eu ...");

  const response = await axios.get("https://www.tolls.eu/fuel-prices", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);
  const rows = $(".table.fuel-prices .tr").not(".heading");

  const extractEuro = (text) => {
    const t = text.replace(/[^\d.,]/g, "").replace(",", ".");
    return t ? parseFloat(t) : null;
  };

  const parsed = [];

  rows.each((_, row) => {
    const cells = $(row).find(".td");

    const code = cells.eq(0).find("input").val()?.trim() || "";
    const country = cells.eq(1).text().trim();
    if (!country) return;

    parsed.push({
      countryCode: code,
      country,
      gasoline: extractEuro(cells.eq(2).text()),
      diesel: extractEuro(cells.eq(3).text()),
      lpg: extractEuro(cells.eq(4).text()),
    });
  });

  console.log(`✅ Parsed ${parsed.length} fuel price rows`);

  if (parsed.length === 0) {
    throw new Error("No fuel price rows parsed!");
  }

  // Save to DB
  await FuelPrice.deleteMany({});
  await FuelPrice.insertMany(parsed);

  console.log("💾 Fuel prices saved to MongoDB");
  return parsed;
}

// ------------------------------------
// API FOR costService.js
// ------------------------------------

/** Get all fuel prices from DB */
async function getFuelPrices() {
  return await FuelPrice.find({});
}

/** Get best matching price for a specific country */
async function getFuelPriceForCountry(countryCode, fuelType) {
  const price = await FuelPrice.findOne({ countryCode });

  if (!price) return null;

  switch (fuelType) {
    case "petrol":
      return price.gasoline;
    case "diesel":
      return price.diesel;
    case "lpg":
      return price.lpg;
    default:
      return null;
  }
}

module.exports = {
  scrapeFuelPrices,
  getFuelPrices,
  getFuelPriceForCountry,
};
