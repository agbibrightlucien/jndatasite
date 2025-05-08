const express = require('express');
const router = express.Router();

// Import route modules here

// Define base routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;