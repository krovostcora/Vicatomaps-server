// src/services/fuelPriceService.js
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

/**
 * Get fuel price for a single country
 */
async function getFuelPrice(countryCode, fuelType) {
    const code = countryCode.length === 2 ? mapTo3Letter(countryCode) : countryCode.toUpperCase();
    const normalizedType = normalizeFuelType(fuelType);
    const fuel = await FuelPrice.findOne({ countryCode: code });
    if (!fuel) return null;

    return fuel[normalizedType] ?? null;
}

/**
 * Get fuel prices for multiple countries
 */
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

module.exports = { getFuelPrice, getFuelPrices };