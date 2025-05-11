require('dotenv').config();

module.exports = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  baseUrl: 'https://api.paystack.co',
  
  // Initialize transaction endpoint
  initializeUrl: '/transaction/initialize',
  
  // Verify transaction endpoint
  verifyUrl: '/transaction/verify',
  
  // Headers for API requests
  getHeaders: () => ({
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  })
};