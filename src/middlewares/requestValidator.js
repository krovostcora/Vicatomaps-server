// src/middlewares/requestValidator.js
const logger = require('../utils/logger');

/**
 * Middleware для валідації запитів за допомогою Joi схем
 * @param {Object} schema - Joi схема валідації
 * @returns {Function} Express middleware
 */
function validate(schema) {
    return (req, res, next) => {
        // Визначити що валідувати (body, params, query)
        const toValidate = {};

        if (schema.body) {
            toValidate.body = req.body;
        } else if (schema.params || schema.query) {
            // Якщо схема має params або query
            if (schema.params) toValidate.params = req.params;
            if (schema.query) toValidate.query = req.query;
        } else {
            // Якщо схема проста (тільки body)
            toValidate.body = req.body;
        }

        // Валідація
        const { error, value } = schema.validate(toValidate.body || req.body, {
            abortEarly: false, // Показати всі помилки
            stripUnknown: true, // Видалити невідомі поля
            convert: true // Конвертувати типи (string → number)
        });

        if (error) {
            // Форматувати помилки
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            logger.warn('Validation failed', {
                path: req.path,
                method: req.method,
                errors: errors
            });

            // Повернути 400 Bad Request
            return res.status(400).json({
                success: false,
                error: {
                    type: 'ValidationError',
                    message: 'Request validation failed',
                    details: errors
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: res.locals.requestId
                }
            });
        }

        // Зберегти валідовані дані
        req.validatedBody = value;

        logger.debug('Validation passed', {
            path: req.path,
            method: req.method
        });

        next();
    };
}

/**
 * Валідація params (для routes з :id, :countryCode, etc.)
 */
function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                error: {
                    type: 'ValidationError',
                    message: 'Invalid URL parameters',
                    details: errors
                }
            });
        }

        req.validatedParams = value;
        next();
    };
}

/**
 * Валідація query parameters
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                error: {
                    type: 'ValidationError',
                    message: 'Invalid query parameters',
                    details: errors
                }
            });
        }

        req.validatedQuery = value;
        next();
    };
}

module.exports = {
    validate,
    validateParams,
    validateQuery
};