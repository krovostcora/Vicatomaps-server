// utils/geospatial.js
const constants = require('../config/constants');

/**
 * Розрахувати відстань між точками (Haversine formula)
 * @param {Array} route - Масив координат
 * @returns {Number} Відстань в кілометрах
 */
function calculateDistance(route) {
    let totalDistance = 0;

    for (let i = 0; i < route.length - 1; i++) {
        totalDistance += haversineDistance(
            route[i].lat,
            route[i].lng,
            route[i + 1].lat,
            route[i + 1].lng
        );
    }

    return totalDistance;
}

/**
 * Haversine formula для відстані між двома точками
 * @returns {Number} Відстань в км
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радіус Землі в км
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Визначити країни на маршруті
 * @param {Array} route - Масив координат
 * @returns {Array} Масив кодів країн
 */
function detectCountries(route) {
    const countries = new Set();

    // Перевіряємо початок, середину, кінець + кілька точок між ними
    const samplePoints = [
        route[0],
        route[Math.floor(route.length * 0.25)],
        route[Math.floor(route.length * 0.5)],
        route[Math.floor(route.length * 0.75)],
        route[route.length - 1]
    ];

    for (const point of samplePoints) {
        const country = guessCountryFromCoordinates(point);
        if (country) {
            countries.add(country);
        }
    }

    return Array.from(countries);
}

/**
 * Вгадати країну з координат (приблизно)
 * @param {Object} point - {lat, lng}
 * @returns {String|null} Код країни або null
 */
function guessCountryFromCoordinates(point) {
    const { lat, lng } = point;

    // Балтія
    if (lat >= 54 && lat <= 56 && lng >= 21 && lng <= 27) return 'LT';
    if (lat >= 56 && lat <= 58 && lng >= 21 && lng <= 28) return 'LV';
    if (lat >= 57.5 && lat <= 60 && lng >= 22 && lng <= 28.2) return 'EE';

    // Польща
    if (lat >= 49 && lat <= 55 && lng >= 14 && lng <= 24) return 'PL';

    // Німеччина
    if (lat >= 47 && lat <= 55 && lng >= 6 && lng <= 15) return 'DE';

    // Франція
    if (lat >= 42 && lat <= 51 && lng >= -5 && lng <= 10) return 'FR';

    // Італія
    if (lat >= 36 && lat <= 47 && lng >= 6 && lng <= 19) return 'IT';

    // Іспанія
    if (lat >= 36 && lat <= 44 && lng >= -10 && lng <= 4) return 'ES';

    // Австрія
    if (lat >= 46.5 && lat <= 49 && lng >= 9.5 && lng <= 17) return 'AT';

    // Чехія
    if (lat >= 48.5 && lat <= 51 && lng >= 12 && lng <= 19) return 'CZ';

    // Словаччина
    if (lat >= 47.5 && lat <= 49.6 && lng >= 16.8 && lng <= 22.6) return 'SK';

    // Швейцарія
    if (lat >= 45.8 && lat <= 47.8 && lng >= 5.9 && lng <= 10.5) return 'CH';

    return null;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

module.exports = {
    calculateDistance,
    haversineDistance,
    detectCountries,
    guessCountryFromCoordinates,
    toRadians
};