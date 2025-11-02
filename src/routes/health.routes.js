// routes/health.routes.js
router.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            mongodb: 'checking',
            redis: 'checking'
        }
    };

    try {
        // Check MongoDB
        await mongoose.connection.db.admin().ping();
        health.services.mongodb = 'connected';
    } catch (error) {
        health.services.mongodb = 'disconnected';
        health.status = 'degraded';
    }

    try {
        // Check Redis
        await redis.ping();
        health.services.redis = 'connected';
    } catch (error) {
        health.services.redis = 'disconnected';
        health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});