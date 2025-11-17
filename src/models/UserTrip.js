// models/UserTrip.js
const mongoose = require('mongoose');

const userTripSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    origin: { type: String, required: true },
    destination: { type: String, required: true },

    originCoords: {
        lat: Number,
        lon: Number
    },

    destinationCoords: {
        lat: Number,
        lon: Number
    },
    
    waypoints: [{
        type: String,
        trim: true
    }],
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    totalCost: {
        type: Number,
        required: true,
        min: 0
    },
    totalDistance: {
        type: Number,
        required: true,
        min: 0
    },
    fuelCost: {
        type: Number,
        min: 0
    },
    tollCost: {
        type: Number,
        min: 0
    },
    duration: {
        type: Number,
        min: 0
    },
    routeData: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('UserTrip', userTripSchema);
