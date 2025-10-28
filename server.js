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
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
const fuelPricesRouter = require('./routes/fuelPrices');
const tollRoadsRouter = require('./routes/tollRoads');
const vehiclesRouter = require('./routes/vehicles');

app.use('/api/fuel-prices', fuelPricesRouter);
app.use('/api/toll-roads', tollRoadsRouter);
app.use('/api/vehicles', vehiclesRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});