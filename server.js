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

// Routes
const vehiclesRouter = require('./routes/vehicles');
app.use('/api/vehicles', vehiclesRouter);
const routeCostRouter = require('./routes/routeCost');
app.use('/api/route-cost', routeCostRouter);
const tollRoadsRouter = require('./routes/tollRoads');
app.use('/api/toll-roads', tollRoadsRouter);
const fuelPricesRouter = require('./routes/fuelPrices');
app.use('/api/fuel-prices', fuelPricesRouter);
const mapboxRoutes = require('./routes/mapboxRoutes');
app.use('/api', mapboxRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Vicatomaps API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      vehicles: '/api/vehicles',
      routeCost: '/api/route-cost',
      tollRoads: '/api/toll-roads',
      fuelPrices: '/api/fuel-prices',
      geocode: '/api/geocode',
      route: '/api/route',
      tolls: '/api/tolls/calculate',
      fuel: '/api/fuel/prices/:country'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});