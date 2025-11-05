// models/RouteCache.js
const mongoose = require('mongoose');

const routeCacheSchema = new mongoose.Schema({
    origin: {
        type: String,
        required: true,
        trim: true
    },
    destination: {
        type: String,
        required: true,
        trim: true
    },
    waypoints: [{
        type: String,
        trim: true
    }],
    routeData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for route lookups
routeCacheSchema.index({ origin: 1, destination: 1 });

// TTL index to automatically delete expired cache entries
routeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RouteCache', routeCacheSchema);
