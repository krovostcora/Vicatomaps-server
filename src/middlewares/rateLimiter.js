// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/redis');

// Загальний ліміт
const generalLimiter = rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'rl:general:'
    }),
    windowMs: 15 * 60 * 1000, // 15 хвилин
    max: 100, // 100 запитів
    message: {
        success: false,
        error: {
            type: 'RateLimitError',
            message: 'Too many requests, please try again later'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Жорсткий ліміт для зовнішніх API
const externalAPILimiter = rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'rl:external:'
    }),
    windowMs: 60 * 60 * 1000, // 1 година
    max: 50, // 50 запитів (економимо RapidAPI)
    skipSuccessfulRequests: true // Не рахувати якщо з кешу
});

module.exports = { generalLimiter, externalAPILimiter };