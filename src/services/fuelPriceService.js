const FuelPrice = require('../models/FuelPrice');

async function getFuelPrice(countryCode, fuelType) {
    const fuel = await FuelPrice.findOne({ countryCode: countryCode.toUpperCase() });
    if (!fuel) return null;
    const type = fuelType.toLowerCase();
    return fuel[type] ?? null;
}

async function getFuelPrices(countries, fuelType) {
    const type = fuelType.toLowerCase();
    const fuels = await FuelPrice.find({ countryCode: { $in: countries.map(c => c.toUpperCase()) } });
    return fuels.map(f => ({
        countryCode: f.countryCode,
        country: f.country,
        price: f[type] ?? null
    }));
}

module.exports = { getFuelPrice, getFuelPrices };
