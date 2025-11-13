// src/models/GoogleRouteCache.js
const mongoose = require("mongoose");

const googleRouteCacheSchema = new mongoose.Schema({
    hash: { type: String, unique: true },
    data: Object,
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("GoogleRouteCache", googleRouteCacheSchema);
