const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection - FIXED (remove deprecated options)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
const vehiclesRouter = require('./routes/vehicles');
const routeCostRouter = require('./routes/routeCost'); // Add new route

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/route-cost', routeCostRouter); // Add new route

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
      routeCost: '/api/route-cost'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});