const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const Vendor = require('../models/Vendor');
const DataBundle = require('../models/DataBundle');
const VendorPrice = require('../models/VendorPrice');
const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');
const { generateToken } = require('../utils/jwt');
const authMiddleware = require('../middleware/auth');
const { validateLogin, validateRegistration, validateSubVendorRegistration } = require('../middleware/validation');
const paystackConfig = require('../config/paystack');

// Create a sub-vendor account
router.post('/me/subvendors', authMiddleware, roleAuth(['vendor']), validateSubVendorRegistration, async (req, res) => {
  try {
    const parentVendor = await Vendor.findById(req.user.id);
    if (!parentVendor.approved) {
      return res.status(403).json({ error: 'Only approved vendors can create sub-vendor accounts' });
    }

    const { name, email, password, phone } = req.body;

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new sub-vendor
    const subVendor = new Vendor({
      name,
      email,
      password,
      phone,
      parentVendor: req.user.id,
      approved: true // Auto-approve sub-vendors
    });

    // Save sub-vendor
    await subVendor.save();

    // Return success without password
    const subVendorWithoutPassword = subVendor.toObject();
    delete subVendorWithoutPassword.password;

    res.status(201).json(subVendorWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Error creating sub-vendor account' });
  }
});

// Public route to get vendor details by vendorLink
router.get('/link/:vendorLink', async (req, res) => {
  try {
    const { vendorLink } = req.params;
    
    // Find vendor by vendorLink
    const vendor = await Vendor.findOne({ vendorLink });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get base bundles
    const bundles = await DataBundle.find();

    // Return only public information
    const publicVendorInfo = {
      name: vendor.name,
      vendorLink: vendor.vendorLink,
      bundles
    };

    res.json(publicVendorInfo);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching vendor details' });
  }
});

// Initialize payment for a vendor's order
router.post('/:vendorLink/pay', async (req, res) => {
  try {
    const { vendorLink } = req.params;
    const { bundleId, customerPhone, customerEmail } = req.body;

    // Validate required fields
    if (!bundleId || !customerPhone || !customerEmail) {
      return res.status(400).json({ error: 'Bundle ID, customer phone and email are required' });
    }

    // Find vendor and check approval status
    const vendor = await Vendor.findOne({ vendorLink });
    if (!vendor || !vendor.approved) {
      return res.status(403).json({ error: 'Vendor not found or not approved' });
    }

    // Find the data bundle
    const bundle = await DataBundle.findById(bundleId);
    if (!bundle) {
      return res.status(404).json({ error: 'Data bundle not found' });
    }

    // Get vendor's custom price for this bundle
    const vendorPrice = await VendorPrice.findOne({
      vendor: vendor._id,
      dataBundle: bundleId
    });

    // Calculate final price
    const amountPaid = vendorPrice ? vendorPrice.price : bundle.basePrice;

    // Initialize payment using the payment utility
    const { initializeTransaction } = require('../utils/payment');
    const response = await initializeTransaction({
      email: customerEmail,
      amount: amountPaid,
      callbackUrl: `${process.env.APP_URL}/api/vendors/${vendorLink}/verify-payment`,
      metadata: {
        bundleId,
        customerPhone,
        vendorId: vendor._id.toString()
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error initializing payment:', error);
    res.status(500).json({ error: 'Error initializing payment' });
  }
});

// Create a new order for a vendor (guest checkout)
router.post('/:vendorLink/orders', async (req, res) => {
  try {
    const { vendorLink } = req.params;
    const { bundleId, customerPhone } = req.body;

    // Validate required fields
    if (!bundleId || !customerPhone) {
      return res.status(400).json({ error: 'Bundle ID and customer phone are required' });
    }

    // Find vendor and check approval status
    const vendor = await Vendor.findOne({ vendorLink });
    if (!vendor || !vendor.approved) {
      return res.status(403).json({ error: 'Vendor not found or not approved' });
    }

    // Find the data bundle
    const bundle = await DataBundle.findById(bundleId);
    if (!bundle) {
      return res.status(404).json({ error: 'Data bundle not found' });
    }

    // Get vendor's custom price for this bundle
    const vendorPrice = await VendorPrice.findOne({
      vendor: vendor._id,
      dataBundle: bundleId
    });

    // Calculate final price
    const amountPaid = vendorPrice ? vendorPrice.price : bundle.basePrice;

    // Create new order
    const order = new Order({
      vendor: vendor._id,
      dataBundle: bundleId,
      customerPhone,
      amountPaid,
      status: 'pending'
    });

    await order.save();

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order._id,
        customerPhone: order.customerPhone,
        amountPaid: order.amountPaid,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error creating order' });
  }
});

// Get available data bundles and prices for a specific vendor
router.get('/:vendorLink/bundles', async (req, res) => {
  try {
    const { vendorLink } = req.params;

    // Find vendor by vendorLink
    const vendor = await Vendor.findOne({ vendorLink });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get all data bundles
    const bundles = await DataBundle.find();

    // Get vendor's custom prices
    const vendorPrices = await VendorPrice.find({ vendor: vendor._id });

    // Map vendor prices to bundles
    const bundlesWithPrices = bundles.map(bundle => {
      const vendorPrice = vendorPrices.find(vp => vp.dataBundle.equals(bundle._id));
      return {
        _id: bundle._id,
        name: bundle.name,
        dataAmount: bundle.dataAmount,
        network: bundle.network,
        price: vendorPrice ? vendorPrice.price : bundle.basePrice
      };
    });

    res.json({
      vendor: {
        name: vendor.name,
        vendorLink: vendor.vendorLink
      },
      bundles: bundlesWithPrices
    });
  } catch (error) {
    console.error('Error fetching bundles:', error);
    res.status(500).json({ error: 'Error fetching data bundles' });
  }
});

// Protected vendor routes
router.use(authMiddleware, roleAuth(['vendor']), async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor || !vendor.approved) {
      return res.status(403).json({ error: 'Access denied. Vendor not approved.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verifying vendor approval status' });
  }
});

// Get vendor's sub-vendors
router.get('/me/subvendors', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { parentVendor: req.user.id };

    // Add approval status filter if provided
    if (req.query.approved !== undefined) {
      filter.approved = req.query.approved === 'true';
    }

    // Get sub-vendors with pagination
    const subVendors = await Vendor.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Vendor.countDocuments(filter);

    res.json({
      subVendors,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching sub-vendors' });
  }
});

// Get vendor's own profile
router.get('/me', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id)
      .select('-password')
      .populate([
        {
          path: 'orders',
          options: { sort: { createdAt: -1 }, limit: 10 }
        },
        {
          path: 'withdrawals',
          options: { sort: { createdAt: -1 }, limit: 10 }
        }
      ]);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching vendor profile' });
  }
});

// Vendor registration route
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new vendor
    const vendor = new Vendor({
      name,
      email,
      password
    });

    // Save vendor (password will be hashed and vendorLink will be generated by pre-save middleware)
    await vendor.save();

    // Return success without password
    const vendorWithoutPassword = vendor.toObject();
    delete vendorWithoutPassword.password;

    res.status(201).json(vendorWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Error creating vendor account' });
  }
});

// Update vendor profile
router.put('/me', validateProfileUpdate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updateFields = {};

    // Only include fields that are provided
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;

    const vendor = await Vendor.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: 'Error updating vendor profile' });
  }
});

// Vendor login route
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find vendor by email
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await vendor.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      id: vendor._id,
      role: vendor.role
    });

    // Return vendor info and token
    const vendorWithoutPassword = vendor.toObject();
    delete vendorWithoutPassword.password;

    res.json({
      vendor: vendorWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Error during login' });
  }
});

// Get vendor's orders
router.get('/me/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {
      $or: [
        { vendor: req.user.id },
        { subVendor: req.user.id }
      ]
    };

    // Add date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Add status filter if provided
    if (req.query.status && ['pending', 'complete'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    // Get orders with pagination and populate related data
    const orders = await Order.find(filter)
      .populate('dataBundle', 'name network basePrice')
      .populate('vendor', 'name email')
      .populate('subVendor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching vendor orders' });
  }
});

// Get vendor's profit and available balance
router.get('/me/profit', async (req, res) => {
  try {
    // Calculate total profit from completed orders
    const profitAggregation = await Order.aggregate([
      {
        $match: {
          $or: [
            { vendor: mongoose.Types.ObjectId(req.user.id) },
            { subVendor: mongoose.Types.ObjectId(req.user.id) }
          ],
          status: 'complete'
        }
      },
      {
        $lookup: {
          from: 'databundles',
          localField: 'dataBundle',
          foreignField: '_id',
          as: 'bundleData'
        }
      },
      { $unwind: '$bundleData' },
      {
        $group: {
          _id: null,
          totalProfit: {
            $sum: { $subtract: ['$amountPaid', '$bundleData.basePrice'] }
          }
        }
      }
    ]);

    // Calculate total approved withdrawals
    const withdrawalAggregation = await Withdrawal.aggregate([
      {
        $match: {
          vendor: mongoose.Types.ObjectId(req.user.id),
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          totalWithdrawn: { $sum: '$amountRequested' }
        }
      }
    ]);

    const totalProfit = profitAggregation[0]?.totalProfit || 0;
    const totalWithdrawn = withdrawalAggregation[0]?.totalWithdrawn || 0;
    const availableBalance = totalProfit - totalWithdrawn;

    res.json({
      totalProfit,
      totalWithdrawn,
      availableBalance
    });
  } catch (error) {
    console.error('Error calculating profit:', error);
    res.status(500).json({ error: 'Error calculating profit and balance' });
  }
});

// Request a withdrawal
router.post('/me/withdrawals', async (req, res) => {
  try {
    const { amountRequested, mobileMoneyNumber } = req.body;

    // Validate input
    if (!amountRequested || typeof amountRequested !== 'number' || amountRequested <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    if (!mobileMoneyNumber || typeof mobileMoneyNumber !== 'string' || mobileMoneyNumber.trim() === '') {
      return res.status(400).json({ error: 'Invalid mobile money number' });
    }

    // Calculate vendor's available balance
    const profitAggregation = await Order.aggregate([
      {
        $match: {
          $or: [
            { vendor: mongoose.Types.ObjectId(req.user.id) },
            { subVendor: mongoose.Types.ObjectId(req.user.id) }
          ],
          status: 'complete'
        }
      },
      {
        $lookup: {
          from: 'databundles',
          localField: 'dataBundle',
          foreignField: '_id',
          as: 'bundleData'
        }
      },
      { $unwind: '$bundleData' },
      {
        $group: {
          _id: null,
          totalProfit: {
            $sum: { $subtract: ['$amountPaid', '$bundleData.basePrice'] }
          }
        }
      }
    ]);

    // Calculate total approved withdrawals
    const withdrawalAggregation = await Withdrawal.aggregate([
      {
        $match: {
          vendor: mongoose.Types.ObjectId(req.user.id),
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          totalWithdrawn: { $sum: '$amountRequested' }
        }
      }
    ]);

    const totalProfit = profitAggregation[0]?.totalProfit || 0;
    const totalWithdrawn = withdrawalAggregation[0]?.totalWithdrawn || 0;
    const availableBalance = totalProfit - totalWithdrawn;

    // Verify sufficient balance
    if (amountRequested > availableBalance) {
      return res.status(400).json({
        error: 'Insufficient balance',
        availableBalance
      });
    }

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      vendor: req.user.id,
      amountRequested,
      mobileMoneyNumber,
      status: 'pending'
    });

    await withdrawal.save();

    res.status(201).json(withdrawal);
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ error: 'Error processing withdrawal request' });
  }
});

// Update vendor prices for data bundles
router.put('/me/prices', async (req, res) => {
  try {
    const { prices } = req.body;

    if (!Array.isArray(prices)) {
      return res.status(400).json({ error: 'Prices must be an array' });
    }

    // Validate and update each price
    const results = await Promise.all(prices.map(async ({ bundleId, price }) => {
      // Validate required fields
      if (!bundleId || typeof price !== 'number') {
        return { error: 'Invalid price data', bundleId };
      }

      // Get bundle to check basePrice
      const bundle = await DataBundle.findById(bundleId);
      if (!bundle) {
        return { error: 'Bundle not found', bundleId };
      }

      // Validate price against basePrice
      if (price < bundle.basePrice) {
        return { error: `Price cannot be less than base price ${bundle.basePrice}`, bundleId };
      }

      // Update or create vendor price
      const vendorPrice = await VendorPrice.findOneAndUpdate(
        { vendor: req.user.id, dataBundle: bundleId },
        { price },
        { new: true, upsert: true, runValidators: true }
      );

      return { success: true, bundleId, price: vendorPrice.price };
    }));

    // Check if any operations failed
    const hasErrors = results.some(result => result.error);
    if (hasErrors) {
      return res.status(400).json({ results });
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Error updating vendor prices' });
  }
});

module.exports = router;

// Get vendor's withdrawal history
router.get('/me/withdrawals', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    // Retrieve vendor's withdrawals
    const withdrawals = await Withdrawal.find({ vendor: req.user.id })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Withdrawal.countDocuments({ vendor: req.user.id });

    res.json({
      withdrawals,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching withdrawal history' });
  }
});