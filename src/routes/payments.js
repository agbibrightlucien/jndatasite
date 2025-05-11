const express = require('express');
const router = express.Router();
const axios = require('axios');
const PaymentTransaction = require('../models/PaymentTransaction');
const Order = require('../models/Order');
const DataBundle = require('../models/DataBundle');
const Vendor = require('../models/Vendor');
const VendorPrice = require('../models/VendorPrice');
const paystackConfig = require('../config/paystack');
const crypto = require('crypto');

// Paystack webhook verification middleware
const verifyPaystackWebhook = (req, res, next) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash === req.headers['x-paystack-signature']) {
      next();
    } else {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error verifying webhook' });
  }
};

// Paystack webhook endpoint
router.post('/verify', verifyPaystackWebhook, async (req, res) => {
  try {
    const event = req.body;

    // Handle only charge.success events
    if (event.event !== 'charge.success') {
      return res.sendStatus(200);
    }

    const { reference } = event.data;
    
    // Create or update payment transaction
    let transaction = await PaymentTransaction.findOne({ reference });
    if (!transaction) {
      transaction = new PaymentTransaction({
        reference,
        amount: event.data.amount / 100,
        status: 'pending'
      });
      await transaction.save();
    }

    // Verify transaction with Paystack API
    const verifyResponse = await axios.get(
      `${paystackConfig.baseUrl}/transaction/verify/${reference}`,
      { headers: paystackConfig.getHeaders() }
    );

    const verifyData = verifyResponse.data.data;
    
    // Verify amount matches
    if (verifyData.amount / 100 !== transaction.amount) {
      transaction.status = 'failed';
      transaction.failureReason = 'Transaction amount mismatch';
      await transaction.save();
      return res.status(400).json({ error: 'Transaction amount mismatch' });
    }

    // Verify transaction status
    if (verifyData.status !== 'success') {
      transaction.status = 'failed';
      transaction.failureReason = 'Transaction verification failed';
      await transaction.save();
      return res.status(400).json({ error: 'Transaction verification failed' });
    }

    // Verify metadata exists and contains required fields
    if (!verifyData.metadata || !verifyData.metadata.bundleId || !verifyData.metadata.customerPhone || !verifyData.metadata.vendorId) {
      transaction.status = 'failed';
      transaction.failureReason = 'Invalid transaction metadata';
      await transaction.save();
      return res.status(400).json({ error: 'Invalid transaction metadata' });
    }

    // Get bundle and customer details from metadata
    const { bundleId, customerPhone, vendorId } = verifyData.metadata;

    // Get the data bundle to calculate profit
    const dataBundle = await DataBundle.findById(bundleId);
    if (!dataBundle) {
      transaction.status = 'failed';
      transaction.failureReason = 'Data bundle not found';
      await transaction.save();
      return res.status(404).json({ error: 'Data bundle not found' });
    }

    // Get vendor's custom price for this bundle
    const vendorPrice = await VendorPrice.findOne({
      vendor: vendorId,
      dataBundle: bundleId
    });

    // Calculate expected amount
    const expectedAmount = vendorPrice ? vendorPrice.price : dataBundle.basePrice;

    // Verify amount matches expected price
    if (verifyData.amount / 100 !== expectedAmount) {
      transaction.status = 'failed';
      transaction.failureReason = 'Payment amount does not match bundle price';
      await transaction.save();
      return res.status(400).json({ error: 'Payment amount does not match bundle price' });
    }

    // Only create order if all verifications pass
    const order = new Order({
      vendor: vendorId,
      dataBundle: bundleId,
      customerPhone,
      amountPaid: verifyData.amount / 100,
      status: 'pending'
    });

    await order.save();

    // Calculate and update vendor's profit
    const profit = verifyData.amount / 100 - dataBundle.basePrice;
    await Vendor.findByIdAndUpdate(
      vendorId,
      { $inc: { profit: profit } }
    );

    // Update transaction status and link order
    transaction.status = 'success';
    transaction.paidAt = new Date();
    transaction.order = order._id;
    await transaction.save();

    // Return success response with order details
    res.status(200).json({
      status: 'success',
      message: 'Payment verified successfully',
      order: {
        id: order._id,
        status: order.status,
        customerPhone: order.customerPhone,
        amountPaid: order.amountPaid,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
});

module.exports = router;