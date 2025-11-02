const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ============================================
// ROUTES
// ============================================

// Mapbox & External APIs (Geocoding, Routes, Tolls, Fuel Prices)
const mapboxRoutes = require('./src/routes/mapbox.routes.js');
app.use('/api', mapboxRoutes);

// User Vehicles Management
const vehiclesRouter = require('./src/routes/vehicle.routes.js');
app.use('/api/vehicles', vehiclesRouter);

// Route Cost Calculation
const routeCostRouter = require('./src/routes/routeCost.routes.js');
app.use('/api/route-cost', routeCostRouter);

// Toll Roads (local DB)
const tollRoutes = require('./src/routes/toll.routes.js');
app.use('/api/tolls', tollRoutes);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'Vicatomaps API Server',
    version: '2.0.0',
    description: 'Route planning with real-time tolls and fuel prices',
    endpoints: {
      // Health
      health: 'GET /health',

      // Mapbox Services
      geocode: 'POST /api/geocode',
      route: 'POST /api/route',

      // TollGuru API
      tolls: 'POST /api/tolls/calculate',

      // Fuel Prices (RapidAPI)
      fuelPrices: 'GET /api/fuel/prices/:country',

      // User Vehicles
      vehicles: 'GET/POST/PUT/DELETE /api/vehicles',

      // Route Cost Calculation
      routeCost: 'POST /api/route-cost'
    },
    apiKeys: {
      mapbox: process.env.MAPBOX_ACCESS_TOKEN ? '✅ Configured' : '❌ Missing',
      tollguru: process.env.TOLLGURU_API_KEY ? '✅ Configured' : '❌ Missing',
      rapidapi: process.env.RAPID_API_KEY ? '✅ Configured' : '❌ Missing'
    }
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Vicatomaps Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗺️  Mapbox: ${process.env.MAPBOX_ACCESS_TOKEN ? '✅' : '❌'}`);
  console.log(`🛣️  TollGuru: ${process.env.TOLLGURU_API_KEY ? '✅' : '❌'}`);
  console.log(`⛽ RapidAPI: ${process.env.RAPID_API_KEY ? '✅' : '❌'}`);
});