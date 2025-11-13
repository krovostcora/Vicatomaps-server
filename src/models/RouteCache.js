// src/models/RouteCache.js
const mongoose = require('mongoose');

const RouteCacheSchema = new mongoose.Schema({
    origin: { type: String, required: true },        // e.g. "52.2297,21.0122"
    destination: { type: String, required: true },   // e.g. "38.7223,-9.1393"
    waypoints: [String],                             // optional intermediate points
    countries: [String],                             // detected countries, e.g. ["PL", "DE", "FR"]
    createdAt: { type: Date, default: Date.now, expires: '90d' }, // auto-delete after 90 days
    polyline: { type: String }
});

module.exports = mongoose.model('RouteCache', RouteCacheSchema);
