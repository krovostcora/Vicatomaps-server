// config/constants.js
module.exports = {
    // Кеш TTL
    CACHE: {
        FUEL_PRICES: 24 * 60 * 60, // 24 години
        TOLL_ROUTES: 7 * 24 * 60 * 60, // 7 днів
        GEOCODING: 30 * 24 * 60 * 60 // 30 днів
    },

    // Ставки toll roads за категоріями (PLN/км)
    TOLL_RATES: {
        PL: {
            A: 0.40, // Autostrada
            S: 0.20, // Droga ekspresowa
            G: 0.10  // Droga krajowa
        }
    },

    // Віньєтки (EUR)
    VIGNETTES: {
        AT: {
            '10_days': 11.50,
            '2_months': 29.00,
            '1_year': 96.40
        },
        CH: {
            '1_year': 40.00 // Тільки річна
        },
        CZ: {
            '10_days': 12.00,
            '1_month': 17.00,
            '1_year': 65.00
        },
        SK: {
            '10_days': 12.00,
            '1_month': 14.00,
            '1_year': 60.00
        },
        SI: {
            '7_days': 15.00,
            '1_month': 30.00,
            '1_year': 117.50
        },
        HU: {
            '10_days': 10.00,
            '1_month': 18.00,
            '1_year': 155.00
        },
        BG: {
            '7_days': 15.00,
            '1_month': 25.00,
            '1_year': 97.00
        },
        RO: {
            '7_days': 3.00,
            '1_month': 7.00,
            '1_year': 28.00
        }
    },

    // Дефолтні ціни палива (EUR/л)
    DEFAULT_FUEL_PRICES: {
        LT: { petrol_95: 1.45, diesel: 1.42, lpg: 0.65 },
        LV: { petrol_95: 1.48, diesel: 1.45, lpg: 0.68 },
        EE: { petrol_95: 1.52, diesel: 1.48, lpg: 0.70 },
        PL: { petrol_95: 1.38, diesel: 1.35, lpg: 0.60 },
        DE: { petrol_95: 1.65, diesel: 1.55, lpg: 0.75 },
        FR: { petrol_95: 1.75, diesel: 1.62, lpg: 0.85 },
        ES: { petrol_95: 1.50, diesel: 1.42, lpg: 0.70 },
        IT: { petrol_95: 1.72, diesel: 1.65, lpg: 0.80 },
        AT: { petrol_95: 1.58, diesel: 1.54, lpg: 0.72 },
        CZ: { petrol_95: 1.52, diesel: 1.48, lpg: 0.68 },
        SK: { petrol_95: 1.60, diesel: 1.56, lpg: 0.70 },
        CH: { petrol_95: 1.85, diesel: 1.80, lpg: 0.90 }
    },

    // Estimates (EUR за 100км автострад)
    ESTIMATED_TOLL_RATES: {
        PL: 12.0,
        FR: 15.0,
        IT: 13.0,
        ES: 10.0,
        PT: 9.0,
        GR: 8.0,
        DE: 0.0,  // Безкоштовно для легкових
        BE: 0.0,
        NL: 0.0,
        LT: 0.0,
        LV: 0.0,
        EE: 0.0
    },

    // Конвертація валют (приблизна)
    CURRENCY_RATES: {
        PLN_TO_EUR: 0.23,
        CHF_TO_EUR: 1.08,
        CZK_TO_EUR: 0.04,
        HUF_TO_EUR: 0.0026
    },

    // Типи транспорту
    VEHICLE_TYPES: {
        '2AxlesAuto': 'car',
        '3AxlesAuto': 'van',
        '4AxlesAuto': 'truck',
        'Motorcycle': 'motorcycle',
        'Bus': 'bus'
    }
};