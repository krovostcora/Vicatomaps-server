// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

/**
 * Загальний rate limiter
 * 100 запитів на 15 хвилин
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 хвилин
    max: 100, // 100 запитів
    message: {
        success: false,
        error: {
            type: 'RateLimitError',
            message: 'Too many requests from this IP, please try again later'
        }
    },
    standardHeaders: true, // Додати RateLimit-* headers
    legacyHeaders: false // Вимкнути X-RateLimit-* headers
});

/**
 * Жорсткіший rate limiter для запитів що використовують зовнішні API
 * 50 запитів на годину
 */
const externalAPILimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 година
    max: 50, // 50 запитів
    message: {
        success: false,
        error: {
            type: 'RateLimitError',
            message: 'Too many API requests, please try again in an hour'
        }
    },
    skipSuccessfulRequests: false, // Рахувати всі запити
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    generalLimiter,
    externalAPILimiter
};