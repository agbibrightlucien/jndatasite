const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const { generateToken } = require('../utils/jwt');
const authMiddleware = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { validateLogin, validateRegistration } = require('../middleware/validation');
const Vendor = require('../models/Vendor');
const DataBundle = require('../models/DataBundle');
const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');

// Apply authentication and role authorization middleware to all routes except login
router.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  }
  authMiddleware(req, res, () => {
    roleAuth(['admin'])(req, res, next);
  });
});

// Get all withdrawal requests
router.get('/withdrawals', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object based on query parameters
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Get withdrawals with pagination and populate vendor details
    const withdrawals = await Withdrawal.find(filter)
      .populate('vendor', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Withdrawal.countDocuments(filter);

    res.json({
      withdrawals,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching withdrawal requests' });
  }
});

// Approve or reject withdrawal request
router.put('/withdrawals/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either approved or rejected' });
    }

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    // Only allow processing of pending withdrawals
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Can only process pending withdrawal requests' });
    }

    withdrawal.status = status;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    res.json({
      message: `Withdrawal request ${status} successfully`,
      withdrawal
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid withdrawal ID format' });
    }
    res.status(500).json({ error: 'Error processing withdrawal request' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    // Calculate total orders and revenue
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "complete"] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          }
        }
      }
    ]);

    // Get total vendors count
    const totalVendors = await Vendor.countDocuments();
    const approvedVendors = await Vendor.countDocuments({ approved: true });

    // Get total data bundles count
    const totalBundles = await DataBundle.countDocuments();

    // Get revenue by network type
    const revenueByNetwork = await Order.aggregate([
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
          _id: '$bundleData.network',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    res.json({
      summary: {
        orders: orderStats[0]?.totalOrders || 0,
        revenue: orderStats[0]?.totalRevenue || 0,
        ordersByStatus: {
          completed: orderStats[0]?.completedOrders || 0,
          pending: orderStats[0]?.pendingOrders || 0,
          cancelled: orderStats[0]?.cancelledOrders || 0
        }
      },
      vendors: {
        total: totalVendors,
        approved: approvedVendors,
        pending: totalVendors - approvedVendors
      },
      bundles: {
        total: totalBundles
      },
      networkStats: revenueByNetwork
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Error fetching analytics data' });
  }
});

// Get all orders with filtering
router.get('/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object based on query parameters
    const filter = {};
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Get orders with pagination and populate references
    const orders = await Order.find(filter)
      .populate('vendor', 'name email')
      .populate('subVendor', 'name email')
      .populate('dataBundle', 'name dataAmount network basePrice')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

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
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// Create new data bundle
router.post('/bundles', async (req, res) => {
  try {
    const { name, dataAmount, network, basePrice } = req.body;

    const bundle = new DataBundle({
      name,
      dataAmount,
      network,
      basePrice
    });

    await bundle.save();
    res.status(201).json(bundle);
  } catch (error) {
    res.status(500).json({ error: 'Error creating data bundle' });
  }
});

// Get all data bundles
router.get('/bundles', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bundles = await DataBundle.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await DataBundle.countDocuments();

    res.json({
      bundles,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data bundles' });
  }
});

// Get single data bundle
router.get('/bundles/:id', async (req, res) => {
  try {
    const bundle = await DataBundle.findById(req.params.id);
    if (!bundle) {
      return res.status(404).json({ error: 'Data bundle not found' });
    }
    res.json(bundle);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid bundle ID format' });
    }
    res.status(500).json({ error: 'Error fetching data bundle' });
  }
});

// Update data bundle
router.put('/bundles/:id', async (req, res) => {
  try {
    const { name, dataAmount, network, basePrice } = req.body;
    
    const bundle = await DataBundle.findById(req.params.id);
    if (!bundle) {
      return res.status(404).json({ error: 'Data bundle not found' });
    }

    bundle.name = name || bundle.name;
    bundle.dataAmount = dataAmount || bundle.dataAmount;
    bundle.network = network || bundle.network;
    bundle.basePrice = basePrice || bundle.basePrice;

    await bundle.save();
    res.json(bundle);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid bundle ID format' });
    }
    res.status(500).json({ error: 'Error updating data bundle' });
  }
});

// Update order status
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status value
    const validStatuses = ['pending', 'complete', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value. Must be one of: pending, complete, cancelled' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }
    res.status(500).json({ error: 'Error updating order status' });
  }
});

// Delete data bundle
router.delete('/bundles/:id', async (req, res) => {
  try {
    const bundle = await DataBundle.findByIdAndDelete(req.params.id);
    if (!bundle) {
      return res.status(404).json({ error: 'Data bundle not found' });
    }
    res.json({ message: 'Data bundle deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid bundle ID format' });
    }
    res.status(500).json({ error: 'Error deleting data bundle' });
  }
});

// Get all sub-vendors pending approval
router.get('/subvendors', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object for sub-vendors pending approval
    const filter = {
      parentVendor: { $ne: null },
      approved: false
    };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get sub-vendors with pagination and populate parent vendor
    const subVendors = await Vendor.find(filter)
      .populate('parentVendor', 'name email')
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

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

// Approve or reject sub-vendor
router.put('/subvendors/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Approved status must be a boolean value' });
    }

    const subVendor = await Vendor.findOne({ _id: id, parentVendor: { $ne: null } });
    if (!subVendor) {
      return res.status(404).json({ error: 'Sub-vendor not found' });
    }

    subVendor.approved = approved;
    await subVendor.save();

    res.json({
      message: `Sub-vendor ${approved ? 'approved' : 'rejected'} successfully`,
      subVendor: subVendor.toObject()
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid sub-vendor ID format' });
    }
    res.status(500).json({ error: 'Error updating sub-vendor approval status' });
  }
});

// Get all vendors route
router.get('/vendors', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object based on query parameters
    const filter = {};
    if (req.query.approved === 'true') filter.approved = true;
    if (req.query.approved === 'false') filter.approved = false;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get vendors with pagination
    const vendors = await Vendor.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Vendor.countDocuments(filter);

    res.json({
      vendors,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching vendors' });
  }
});

// Admin registration route
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new admin
    const admin = new Admin({
      name,
      email,
      password
    });

    // Save admin (password will be hashed by the pre-save middleware)
    await admin.save();

    // Return success without password
    const adminWithoutPassword = admin.toObject();
    delete adminWithoutPassword.password;

    res.status(201).json(adminWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Error creating admin account' });
  }
});

// Admin login route
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      id: admin._id,
      role: admin.role
    });

    // Return admin info and token
    const adminWithoutPassword = admin.toObject();
    delete adminWithoutPassword.password;

    res.json({
      admin: adminWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Error during login' });
  }
});

// Approve or reject vendor route
router.put('/vendors/:vendorId/approve', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Approved status must be a boolean value' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor.approved = approved;
    await vendor.save();

    res.json({
      message: `Vendor ${approved ? 'approved' : 'rejected'} successfully`,
      vendor: vendor.toObject()
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid vendor ID format' });
    }
    res.status(500).json({ error: 'Error updating vendor approval status' });
  }
});

module.exports = router;