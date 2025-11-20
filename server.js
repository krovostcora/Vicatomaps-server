// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./src/config/database');
const { initializeFirebase } = require('./src/config/firebase');

// Import routes
const authRoutes = require('./src/routes/auth');
const routesRouter = require('./src/routes/routes');
const vehiclesRouter = require('./src/routes/vehicles');
const fuelPricesRouter = require('./src/routes/fuelPrices');
const healthRouter = require('./src/routes/health');
const adminRoutes = require('./src/routes/admin');
const tripsRouter = require('./src/routes/trips');

const app = express();
// Trust proxy for Render/production
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Initialize Firebase Admin SDK
initializeFirebase();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRouter);
app.use('/api/routes', routesRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/fuel-prices', fuelPricesRouter);
app.use('/api/fuel', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trips', tripsRouter);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Vicatomaps API Server',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            routes: '/api/routes',
            vehicles: '/api/vehicles',
            fuelPrices: '/api/fuel-prices',
            health: '/api/health'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal server error',
            status: err.status || 500
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('GOOGLE_ROUTES_API_KEY:', process.env.GOOGLE_ROUTES_API_KEY ? '✅ Loaded' : '❌ Missing');
    console.log('TOLLGURU_API_KEY:', process.env.TOLLGURU_API_KEY ? '✅ Loaded' : '❌ Missing');
    console.log('🔥 Firebase initialized');
});

module.exports = app;