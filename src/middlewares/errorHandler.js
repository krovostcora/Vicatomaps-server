// middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
    logger.error('Error occurred', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Уніфікований формат помилки
    const response = {
        success: false,
        error: {
            type: err.name || 'Error',
            message: err.message,
            ...(err.field && { field: err.field }),
            ...(err.service && { service: err.service })
        },
        meta: {
            requestId: req.id,
            timestamp: new Date().toISOString()
        }
    };

    // Не показувати stack в production
    if (process.env.NODE_ENV !== 'production') {
        response.error.stack = err.stack;
    }

    res.status(err.statusCode || 500).json(response);
}