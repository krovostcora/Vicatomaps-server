const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection - FIXED
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
const fuelPricesRouter = require('./routes/fuelPrices');
const tollRoadsRouter = require('./routes/tollRoads');
const vehiclesRouter = require('./routes/vehicles');

app.use('/api/fuel-prices', fuelPricesRouter);
app.use('/api/toll-roads', tollRoadsRouter);
app.use('/api/vehicles', vehiclesRouter);

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
      fuelPrices: '/api/fuel-prices',
      tollRoads: '/api/toll-roads',
      vehicles: '/api/vehicles'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

MONGODB_URI = mongodb+srv://annnakutova_db_user:LDcW8EICIaffc2Da@vicatomaps.mq9y2iv.mongodb.net/?appName=Vicatomaps
PORT = 10000
NODE_ENV = production
