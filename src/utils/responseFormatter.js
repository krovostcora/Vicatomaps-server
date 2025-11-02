// utils/responseFormatter.js
function successResponse(res, data, meta = {}) {
    return res.status(200).json({
        success: true,
        data: data,
        meta: {
            timestamp: new Date().toISOString(),
            requestId: res.locals.requestId,
            ...meta
        }
    });
}