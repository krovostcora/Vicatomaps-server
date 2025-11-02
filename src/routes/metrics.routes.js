// routes/metrics.routes.js
const promClient = require('prom-client');

const register = new promClient.Registry();

// Request duration histogram
const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
});

// Request counter
const httpRequestCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
});

// Middleware для збору метрик
function metricsMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;

        httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
        httpRequestCounter.labels(req.method, route, res.statusCode).inc();
    });

    next();
}

router.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});