// src/utils/responseFormatter.js

/**
 * Форматувати успішну відповідь
 * @param {Object} res - Express response
 * @param {Object} data - Дані для відповіді
 * @param {Object} meta - Додаткові метадані
 * @returns {Object} JSON response
 */
function successResponse(res, data, meta = {}) {
    return res.status(200).json({
        success: true,
        data: data,
        meta: {
            timestamp: new Date().toISOString(),
            requestId: res.locals.requestId || 'unknown',
            ...meta
        }
    });
}

/**
 * Форматувати помилкову відповідь
 * @param {Object} res - Express response
 * @param {Object} error - Об'єкт помилки
 * @param {Number} statusCode - HTTP status code
 * @returns {Object} JSON response
 */
function errorResponse(res, error, statusCode = 500) {
    return res.status(statusCode).json({
        success: false,
        error: {
            type: error.name || 'Error',
            message: error.message || 'An error occurred',
            ...(error.field && { field: error.field }),
            ...(error.code && { code: error.code }),
            ...(process.env.NODE_ENV !== 'production' && error.stack && {
                stack: error.stack
            })
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId: res.locals.requestId || 'unknown'
        }
    });
}

module.exports = {
    successResponse,
    errorResponse
};