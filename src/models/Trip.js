// src/models/Trip.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    lat: {
        type: Number,
        required: true
    },
    lon: {
        type: Number,
        required: true
    },
    address: {
        type: String
    }
}, { _id: false });

const countryBreakdownSchema = new mongoose.Schema({
    countryCode: String,
    country: String,
    pricePerLiter: Number,
    liters: Number,
    cost: Number
}, { _id: false });

const tripSchema = new mongoose.Schema({
    // Власник поїздки
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Машина
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },

    // Маршрут
    origin: {
        type: locationSchema,
        required: true
    },

    destination: {
        type: locationSchema,
        required: true
    },

    waypoints: [locationSchema],

    // Параметри маршруту
    distance: {
        type: Number, // meters
        required: true
    },

    duration: {
        type: Number, // seconds
        required: true
    },

    // Країни на маршруті
    countries: [{
        type: String
    }],

    // Вартість палива
    fuelCost: {
        total: {
            type: Number,
            required: true
        },
        totalLiters: {
            type: Number,
            required: true
        },
        breakdown: [countryBreakdownSchema]
    },

    // Вартість платних доріг
    tollCost: {
        type: Number,
        default: 0
    },

    // Загальна вартість
    totalCost: {
        type: Number,
        required: true
    },

    // Валюта
    currency: {
        type: String,
        default: 'EUR'
    },

    // Метадані
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Для майбутніх фіч
    notes: {
        type: String
    },

    isFavorite: {
        type: Boolean,
        default: false
    },

    actualCost: {
        type: Number // якщо користувач введе реальну вартість після поїздки
    }
}, {
    timestamps: true
});

// Індекси
tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ userId: 1, isFavorite: 1 });

// Віртуальні поля
tripSchema.virtual('distanceKm').get(function() {
    return (this.distance / 1000).toFixed(2);
});

tripSchema.virtual('durationHours').get(function() {
    return (this.duration / 3600).toFixed(2);
});

// Методи
tripSchema.methods.toSummary = function() {
    return {
        id: this._id,
        origin: this.origin.address || `${this.origin.lat}, ${this.origin.lon}`,
        destination: this.destination.address || `${this.destination.lat}, ${this.destination.lon}`,
        distance: this.distanceKm + ' km',
        duration: this.durationHours + ' hours',
        totalCost: this.totalCost,
        currency: this.currency,
        date: this.createdAt
    };
};

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;