const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Додати requestId для кожного запиту
app.use((req, res, next) => {
  res.locals.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
const tollRoutes = require('./src/routes/toll.routes');
app.use('/api/tolls', tollRoutes);

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
    version: '2.0.0',
    endpoints: {
      health: 'GET /health',
      tolls: 'POST /api/tolls/calculate'
    }
  });
});

// Error handler (має бути останнім!)
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      type: err.name || 'Error',
      message: err.message || 'Internal server error'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
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
  console.log(`⛽ RapidAPI: ${process.env.RAPID_API_KEY ? '✅' : '❌'}`);
});