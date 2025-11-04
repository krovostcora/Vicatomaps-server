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
 * Визначити країни на маршруті - ПОКРАЩЕНА ВЕРСІЯ
 * @param {Array} route - Масив координат
 * @returns {Array} Масив кодів країн
 */
function detectCountries(route) {
    const countries = new Set();

    // Беремо більше точок для точнішого визначення
    const sampleSize = Math.min(20, route.length);
    const step = Math.max(1, Math.floor(route.length / sampleSize));

    for (let i = 0; i < route.length; i += step) {
        const country = guessCountryFromCoordinates(route[i]);
        if (country) {
            countries.add(country);
        }
    }

    // Завжди перевіряємо останню точку
    const lastCountry = guessCountryFromCoordinates(route[route.length - 1]);
    if (lastCountry) {
        countries.add(lastCountry);
    }

    return Array.from(countries);
}

/**
 * Вгадати країну з координат - ТОЧНІШІ МЕЖІ
 * @param {Object} point - {lat, lng}
 * @returns {String|null} Код країни або null
 */
function guessCountryFromCoordinates(point) {
    const { lat, lng } = point;

    // ═══════════════════════════════════════════════════════════
    // БАЛТІЙСЬКІ КРАЇНИ
    // ═══════════════════════════════════════════════════════════

    // Литва
    if (lat >= 53.9 && lat <= 56.5 && lng >= 20.9 && lng <= 26.9) {
        return 'LT';
    }

    // Латвія
    if (lat >= 55.7 && lat <= 58.1 && lng >= 20.9 && lng <= 28.3) {
        return 'LV';
    }

    // Естонія
    if (lat >= 57.5 && lat <= 59.7 && lng >= 21.8 && lng <= 28.2) {
        return 'EE';
    }

    // ═══════════════════════════════════════════════════════════
    // ЦЕНТРАЛЬНА ЄВРОПА
    // ═══════════════════════════════════════════════════════════

    // Польща
    if (lat >= 49.0 && lat <= 54.9 && lng >= 14.1 && lng <= 24.2) {
        return 'PL';
    }

    // Німеччина
    if (lat >= 47.2 && lat <= 55.1 && lng >= 5.8 && lng <= 15.1) {
        return 'DE';
    }

    // Чехія
    if (lat >= 48.5 && lat <= 51.1 && lng >= 12.0 && lng <= 18.9) {
        return 'CZ';
    }

    // Словаччина
    if (lat >= 47.7 && lat <= 49.6 && lng >= 16.8 && lng <= 22.6) {
        return 'SK';
    }

    // Австрія
    if (lat >= 46.4 && lat <= 49.1 && lng >= 9.5 && lng <= 17.2) {
        return 'AT';
    }

    // Швейцарія
    if (lat >= 45.8 && lat <= 47.9 && lng >= 5.9 && lng <= 10.5) {
        return 'CH';
    }

    // Ліхтенштейн (дуже малий)
    if (lat >= 47.0 && lat <= 47.3 && lng >= 9.4 && lng <= 9.7) {
        return 'LI';
    }

    // ═══════════════════════════════════════════════════════════
    // ПІВДЕННА ЄВРОПА
    // ═══════════════════════════════════════════════════════════

    // Угорщина
    if (lat >= 45.7 && lat <= 48.6 && lng >= 16.1 && lng <= 22.9) {
        return 'HU';
    }

    // Словенія
    if (lat >= 45.4 && lat <= 46.9 && lng >= 13.4 && lng <= 16.6) {
        return 'SI';
    }

    // Хорватія
    if (lat >= 42.4 && lat <= 46.6 && lng >= 13.5 && lng <= 19.4) {
        return 'HR';
    }

    // Італія (складна форма)
    if (lat >= 35.5 && lat <= 47.1 && lng >= 6.6 && lng <= 18.5) {
        // Додаткова перевірка для виключення Швейцарії/Австрії
        if (lat < 46.0 || (lat >= 46.0 && lng > 10.0)) {
            return 'IT';
        }
    }

    // Франція
    if (lat >= 41.3 && lat <= 51.1 && lng >= -5.2 && lng <= 9.6) {
        // Виключити Швейцарію та Італію
        if (lng < 5.9 || (lng >= 5.9 && lng <= 9.6 && lat > 47.8)) {
            return 'FR';
        }
    }

    // Іспанія
    if (lat >= 35.2 && lat <= 43.8 && lng >= -9.3 && lng <= 4.3) {
        return 'ES';
    }

    // Португалія
    if (lat >= 36.9 && lat <= 42.2 && lng >= -9.5 && lng <= -6.2) {
        return 'PT';
    }

    // ═══════════════════════════════════════════════════════════
    // БАЛКАНИ
    // ═══════════════════════════════════════════════════════════

    // Румунія
    if (lat >= 43.6 && lat <= 48.3 && lng >= 20.3 && lng <= 30.0) {
        return 'RO';
    }

    // Болгарія
    if (lat >= 41.2 && lat <= 44.2 && lng >= 22.4 && lng <= 28.6) {
        return 'BG';
    }

    // Сербія
    if (lat >= 42.2 && lat <= 46.2 && lng >= 18.8 && lng <= 23.0) {
        return 'RS';
    }

    // Греція
    if (lat >= 34.8 && lat <= 41.8 && lng >= 19.4 && lng <= 28.3) {
        return 'GR';
    }

    // ═══════════════════════════════════════════════════════════
    // BENELUX
    // ═══════════════════════════════════════════════════════════

    // Нідерланди
    if (lat >= 50.7 && lat <= 53.6 && lng >= 3.3 && lng <= 7.2) {
        return 'NL';
    }

    // Бельгія
    if (lat >= 49.5 && lat <= 51.5 && lng >= 2.5 && lng <= 6.4) {
        return 'BE';
    }

    // Люксембург
    if (lat >= 49.4 && lat <= 50.2 && lng >= 5.7 && lng <= 6.5) {
        return 'LU';
    }

    // ═══════════════════════════════════════════════════════════
    // СКАНДИНАВІЯ
    // ═══════════════════════════════════════════════════════════

    // Данія
    if (lat >= 54.5 && lat <= 57.8 && lng >= 8.0 && lng <= 15.2) {
        return 'DK';
    }

    // Швеція
    if (lat >= 55.3 && lat <= 69.1 && lng >= 11.0 && lng <= 24.2) {
        return 'SE';
    }

    // Норвегія
    if (lat >= 57.9 && lat <= 71.2 && lng >= 4.5 && lng <= 31.2) {
        return 'NO';
    }

    // Фінляндія
    if (lat >= 59.8 && lat <= 70.1 && lng >= 20.5 && lng <= 31.6) {
        return 'FI';
    }

    // ═══════════════════════════════════════════════════════════
    // БРИТАНСЬКІ ОСТРОВИ
    // ═══════════════════════════════════════════════════════════

    // Велика Британія
    if (lat >= 49.9 && lat <= 60.9 && lng >= -8.2 && lng <= 2.0) {
        return 'GB';
    }

    // Ірландія
    if (lat >= 51.4 && lat <= 55.4 && lng >= -10.5 && lng <= -5.4) {
        return 'IE';
    }

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