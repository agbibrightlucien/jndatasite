const axios = require('axios');
const paystackConfig = require('../config/paystack');

/**
 * Initialize a Paystack transaction
 * @param {Object} data - Transaction data
 * @param {string} data.email - Customer's email address
 * @param {number} data.amount - Amount in base currency (will be converted to kobo)
 * @param {string} data.callbackUrl - URL to redirect to after payment
 * @param {Object} data.metadata - Additional information about the transaction
 * @param {string} data.metadata.bundleId - ID of the data bundle being purchased
 * @param {string} data.metadata.customerPhone - Customer's phone number
 * @param {string} data.metadata.vendorId - ID of the vendor
 * @returns {Promise<Object>} Paystack API response
 */
const initializeTransaction = async ({ email, amount, callbackUrl, metadata }) => {
  try {
    // Validate and format Ghanaian phone number if present in metadata
    if (metadata && metadata.customerPhone) {
      const { isValidGhanaianPhone, formatGhanaianPhone } = require('./phoneValidation');
      
      // Validate the phone number
      if (!isValidGhanaianPhone(metadata.customerPhone)) {
        throw new Error('Invalid Ghanaian phone number format. Must be 10 digits.');
      }
      
      // Format the phone number for consistency
      metadata.customerPhone = metadata.customerPhone.replace(/\D/g, '');
    }
    
    const response = await axios.post(
      `${paystackConfig.baseUrl}${paystackConfig.initializeUrl}`,
      {
        email,
        amount: amount * 100, // Convert to kobo
        callback_url: callbackUrl,
        metadata
      },
      { headers: paystackConfig.getHeaders() }
    );

    return response.data;
  } catch (error) {
    console.error('Error initializing Paystack transaction:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      if (status === 401) {
        throw new Error('Invalid API key or unauthorized access');
      } else if (status === 422) {
        throw new Error(data.message || 'Invalid transaction data provided');
      }
      throw new Error(`Payment initialization failed: ${data.message || 'Unknown error'}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Network error: Could not reach Paystack servers');
    }
    
    throw new Error('Failed to initialize payment: An unexpected error occurred');
  }
};

/**
 * Verify a Paystack transaction
 * @param {string} reference - Transaction reference to verify
 * @returns {Promise<Object>} Verified transaction data
 */
const verifyTransaction = async (reference) => {
  try {
    const response = await axios.get(
      `${paystackConfig.baseUrl}/transaction/verify/${reference}`,
      { headers: paystackConfig.getHeaders() }
    );

    return response.data;
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      if (status === 401) {
        throw new Error('Invalid API key or unauthorized access');
      } else if (status === 404) {
        throw new Error('Transaction reference not found');
      }
      throw new Error(`Transaction verification failed: ${data.message || 'Unknown error'}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Network error: Could not reach Paystack servers');
    }
    
    throw new Error('Failed to verify transaction: An unexpected error occurred');
  }
};

module.exports = {
  initializeTransaction,
  verifyTransaction
};