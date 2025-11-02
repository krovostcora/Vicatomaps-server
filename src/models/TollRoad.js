// src/models/TollRoad.js
const mongoose = require('mongoose');

/**
 * PRICING SCHEMA
 * Вкладена схема для цін на різні типи транспорту
 */
const pricingSchema = new mongoose.Schema({
    vehicleClass: {
        type: String,
        enum: ['car', 'van', 'truck', 'motorcycle', 'bus'],
        required: true,
        index: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: 'EUR',
        uppercase: true
    },
    pricingType: {
        type: String,
        enum: ['fixed', 'per_km', 'daily', 'weekly', 'monthly', 'yearly'],
        default: 'fixed'
    },
    description: {
        type: String,
        maxlength: 500
    }
}, { _id: false }); // Не створювати окремий _id для subdocument

/**
 * TOLL ROAD SCHEMA
 * Основна схема платної дороги
 */
const tollRoadSchema = new mongoose.Schema({
    // ═══════════ ОСНОВНА ІНФОРМАЦІЯ ═══════════
    name: {
        type: String,
        required: [true, 'Toll road name is required'],
        trim: true,
        maxlength: [200, 'Name cannot exceed 200 characters']
    },

    country: {
        type: String,
        required: [true, 'Country code is required'],
        uppercase: true,
        minlength: 2,
        maxlength: 2,
        index: true // Індекс для швидкого пошуку по країні
    },

    roadType: {
        type: String,
        enum: {
            values: ['highway', 'expressway', 'bridge', 'tunnel', 'vignette'],
            message: '{VALUE} is not a valid road type'
        },
        required: true,
        index: true
    },

    // ═══════════ ДЕТАЛІ ДОРОГИ ═══════════
    roadNumber: {
        type: String,
        trim: true,
        maxlength: 20,
        index: true // Індекс для пошуку по номеру (A4, S12, etc.)
    },

    lengthKm: {
        type: Number,
        min: [0, 'Length cannot be negative'],
        max: [10000, 'Length seems too large']
    },

    category: {
        type: String,
        enum: ['A', 'S', 'G', null], // Польські категорії
        uppercase: true
    },

    // ═══════════ ГЕОПРОСТОРОВІ ДАНІ ═══════════
    geometry: {
        type: {
            type: String,
            enum: ['Point', 'LineString'],
            required: true
        },
        coordinates: {
            type: [[]],
            required: true,
            validate: {
                validator: function(coords) {
                    if (this.geometry.type === 'Point') {
                        // Point: [lng, lat]
                        return coords.length === 2 &&
                            coords[0] >= -180 && coords[0] <= 180 &&
                            coords[1] >= -90 && coords[1] <= 90;
                    } else {
                        // LineString: [[lng, lat], [lng, lat], ...]
                        return coords.length >= 2;
                    }
                },
                message: 'Invalid coordinates format'
            }
        }
    },

    // ═══════════ ЦІНОУТВОРЕННЯ ═══════════
    pricing: {
        type: [pricingSchema],
        required: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'At least one pricing option is required'
        }
    },

    // ═══════════ ДОДАТКОВА ІНФОРМАЦІЯ ═══════════
    paymentMethods: [{
        type: String,
        enum: ['cash', 'card', 'electronic_tag', 'online', 'mobile_app']
    }],

    operator: {
        type: String,
        trim: true,
        maxlength: 200
    },

    etollSystem: {
        type: Boolean,
        default: false
    },

    active: {
        type: Boolean,
        default: true,
        index: true // Індекс для фільтрації активних доріг
    },

    description: {
        type: String,
        maxlength: 1000
    },

    // ═══════════ МЕТАДАНІ ═══════════
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true // Не можна змінити після створення
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true, // Автоматично керує createdAt і updatedAt
    collection: 'tollroads' // Назва колекції в MongoDB
});

// ═══════════════════════════════════════════
// ІНДЕКСИ
// ═══════════════════════════════════════════

/**
 * GEOSPATIAL INDEX (2dsphere)
 * Дозволяє робити geospatial queries ($geoIntersects, $geoWithin, etc.)
 */
tollRoadSchema.index({ geometry: '2dsphere' });

/**
 * COMPOUND INDEX (country + active)
 * Оптимізує запити типу: find({ country: 'PL', active: true })
 */
tollRoadSchema.index({ country: 1, active: 1 });

/**
 * COMPOUND INDEX (country + roadNumber)
 * Оптимізує запити типу: find({ country: 'PL', roadNumber: 'A4' })
 */
tollRoadSchema.index({ country: 1, roadNumber: 1 });

/**
 * TEXT INDEX (для пошуку по назві)
 * Дозволяє робити text search: find({ $text: { $search: 'Warszawa' } })
 */
tollRoadSchema.index({ name: 'text', description: 'text' });

// ═══════════════════════════════════════════
// MIDDLEWARE (HOOKS)
// ═══════════════════════════════════════════

/**
 * PRE-SAVE HOOK
 * Виконується перед збереженням документа
 */
tollRoadSchema.pre('save', function(next) {
    // Оновити updatedAt
    this.updatedAt = new Date();

    // Валідація: якщо є категорія, має бути Польща
    if (this.category && this.country !== 'PL') {
        return next(new Error('Category field is only valid for Poland (PL)'));
    }

    next();
});

/**
 * POST-SAVE HOOK
 * Виконується після збереження документа
 */
tollRoadSchema.post('save', function(doc) {
    console.log(`✅ Toll road saved: ${doc.name} (${doc.country})`);
});

// ═══════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════

/**
 * Отримати ціну для конкретного типу транспорту
 * @param {String} vehicleClass - Тип транспорту (car, van, truck, etc.)
 * @returns {Object|null} Pricing об'єкт або null
 */
tollRoadSchema.methods.getPricingForVehicle = function(vehicleClass) {
    return this.pricing.find(p => p.vehicleClass === vehicleClass) || null;
};

/**
 * Перевірити чи дорога активна
 * @returns {Boolean}
 */
tollRoadSchema.methods.isActive = function() {
    return this.active === true;
};

/**
 * Конвертувати ціну в EUR
 * @param {String} vehicleClass
 * @returns {Number|null} Ціна в EUR або null
 */
tollRoadSchema.methods.getPriceInEUR = function(vehicleClass) {
    const pricing = this.getPricingForVehicle(vehicleClass);
    if (!pricing) return null;

    // Конверсія валют (спрощена, краще використовувати API)
    const rates = {
        'EUR': 1,
        'PLN': 0.23,
        'CHF': 1.08,
        'CZK': 0.04,
        'HUF': 0.0026
    };

    const rate = rates[pricing.currency] || 1;
    return pricing.price * rate;
};

// ═══════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════

/**
 * Знайти всі активні дороги в країні
 * @param {String} countryCode - Код країни (PL, FR, IT, etc.)
 * @returns {Promise<Array>}
 */
tollRoadSchema.statics.findByCountry = function(countryCode) {
    return this.find({
        country: countryCode.toUpperCase(),
        active: true
    })
        .lean()
        .exec();
};

/**
 * Знайти дороги що перетинаються з маршрутом
 * @param {Object} routeLine - GeoJSON LineString
 * @param {Array} countries - Масив кодів країн
 * @returns {Promise<Array>}
 */
tollRoadSchema.statics.findAlongRoute = function(routeLine, countries = []) {
    const query = {
        geometry: {
            $geoIntersects: {
                $geometry: routeLine
            }
        },
        active: true
    };

    // Додати фільтр по країнах якщо надано
    if (countries.length > 0) {
        query.country = { $in: countries.map(c => c.toUpperCase()) };
    }

    return this.find(query)
        .lean()
        .select('name country pricing category lengthKm roadNumber roadType')
        .exec();
};

/**
 * Отримати статистику по країні
 * @param {String} countryCode
 * @returns {Promise<Object>}
 */
tollRoadSchema.statics.getCountryStats = async function(countryCode) {
    const stats = await this.aggregate([
        { $match: { country: countryCode.toUpperCase(), active: true } },
        {
            $group: {
                _id: '$roadType',
                count: { $sum: 1 },
                totalLength: { $sum: '$lengthKm' }
            }
        }
    ]);

    return stats;
};

// ═══════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════

/**
 * Virtual для повної назви з країною
 */
tollRoadSchema.virtual('fullName').get(function() {
    return `${this.name} (${this.country})`;
});

/**
 * Virtual для мінімальної ціни
 */
tollRoadSchema.virtual('minPrice').get(function() {
    if (!this.pricing || this.pricing.length === 0) return null;
    return Math.min(...this.pricing.map(p => p.price));
});

// Включити virtuals в JSON
tollRoadSchema.set('toJSON', { virtuals: true });
tollRoadSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════
// EXPORT MODEL
// ═══════════════════════════════════════════

const TollRoad = mongoose.model('TollRoad', tollRoadSchema);

module.exports = TollRoad;