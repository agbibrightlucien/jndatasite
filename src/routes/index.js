const express = require('express');
const router = express.Router();

// Import route modules here
const adminRoutes = require('./admin');
const vendorRoutes = require('./vendor');

// Define base routes
router.use('/admin', adminRoutes);
router.use('/vendors', vendorRoutes);
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;