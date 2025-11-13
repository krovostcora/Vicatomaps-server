// src/services/fuelPriceService.js
const axios = require('axios');
const cheerio = require('cheerio');
const FuelPrice = require('../models/FuelPrice');

const countryMap = {
    DE: 'DEU', PL: 'POL', BE: 'BEL', FR: 'FRA', ES: 'ESP', PT: 'PRT',
    IT: 'ITA', NL: 'NLD', AT: 'AUT', CZ: 'CZE', SK: 'SVK', HU: 'HUN',
    CH: 'CHE', SI: 'SVN', HR: 'HRV', RO: 'ROU', BG: 'BGR', GR: 'GRC',
    UA: 'UKR', GB: 'GBR', IE: 'IRL', DK: 'DNK', SE: 'SWE', NO: 'NOR',
    FI: 'FIN', LT: 'LTU', LV: 'LVA', EE: 'EST'
};

const fuelTypeMap = {
    petrol: 'gasoline',
    gasoline: 'gasoline',
    diesel: 'diesel',
    lpg: 'lpg'
};

function mapTo3Letter(code2) {
    return countryMap[code2.toUpperCase()] || code2.toUpperCase();
}

function normalizeFuelType(type) {
    const key = type.toLowerCase();
    return fuelTypeMap[key] || 'gasoline';
}

async function getFuelPrice(countryCode, fuelType) {
    const code = countryCode.length === 2 ? mapTo3Letter(countryCode) : countryCode.toUpperCase();
    const normalizedType = normalizeFuelType(fuelType);
    const fuel = await FuelPrice.findOne({ countryCode: code });
    if (!fuel) return null;

    return fuel[normalizedType] ?? null;
}

async function getFuelPrices(countries, fuelType) {
    const mappedCodes = countries.map(c =>
        c.length === 2 ? mapTo3Letter(c) : c.toUpperCase()
    );

    const normalizedType = normalizeFuelType(fuelType);
    const fuels = await FuelPrice.find({ countryCode: { $in: mappedCodes } });

    return fuels.map(f => ({
        countryCode: f.countryCode,
        country: f.country,
        price: f[normalizedType] ?? null
    }));
}

/**
 * 🌍 Scrape latest EU fuel prices from European Commission
 */
async function scrapeFuelPrices() {
    console.log('⛽ Fetching latest EU fuel prices...');
    try {
        const url = 'https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const prices = [];
        $('table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            const country = $(cols[0]).text().trim();
            const gasoline = parseFloat($(cols[1]).text().replace(',', '.'));
            const diesel = parseFloat($(cols[2]).text().replace(',', '.'));
            const lpg = parseFloat($(cols[3]).text().replace(',', '.'));

            if (country && !isNaN(gasoline)) {
                const code2 = Object.keys(countryMap).find(
                    key => countryMap[key] && country.toLowerCase().includes(key.toLowerCase())
                );
                prices.push({
                    country,
                    countryCode: code2 ? mapTo3Letter(code2) : country.slice(0, 3).toUpperCase(),
                    gasoline,
                    diesel,
                    lpg
                });
            }
        });

        if (prices.length > 0) {
            await FuelPrice.deleteMany({});
            await FuelPrice.insertMany(prices);
            console.log(`✅ Updated ${prices.length} fuel prices`);
        } else {
            console.warn('⚠️ No prices parsed!');
        }

        return prices;
    } catch (err) {
        console.error('❌ Failed to scrape fuel prices:', err.message);
        throw err;
    }
}

module.exports = { getFuelPrice, getFuelPrices, scrapeFuelPrices };
