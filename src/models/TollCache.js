// models/TollCache.js
const mongoose = require('mongoose');

const tollCacheSchema = new mongoose.Schema({
    hash: { type: String, unique: true },
    data: Object,
    updatedAt: Date
});

module.exports = mongoose.model('TollCache', tollCacheSchema);
