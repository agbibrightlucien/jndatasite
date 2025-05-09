const express = require('express');
const router = express.Router();

// Import route modules here
const adminRoutes = require('./admin');

// Define base routes
router.use('/admin', adminRoutes);
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;