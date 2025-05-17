const express = require('express');
const router = express.Router();
const { APIError } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Get user profile
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    // The user object is attached to the request by the auth middleware
    const userId = req.user.id;
    
    // Retrieve full user data from database
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new APIError(404, 'User not found');
    }

    res.json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { username, email } = req.body;
    
    // Basic validation
    if (!username && !email) {
      throw new APIError(400, 'No update data provided');
    }
    
    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        throw new APIError(400, 'Email already in use');
      }
    }
    
    // Check if username is already taken by another user
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        throw new APIError(400, 'Username already taken');
      }
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      throw new APIError(404, 'User not found');
    }

    res.json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all users (admin only)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new APIError(403, 'Access denied. Admin privileges required');
    }
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get users with pagination
    const users = await User.find()
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
      
    // Get total count for pagination
    const total = await User.countDocuments();

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (admin or self)
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Check if user is admin or requesting their own profile
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      throw new APIError(403, 'Access denied');
    }
    
    // Find user by ID
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new APIError(404, 'User not found');
    }

    res.json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      next(new APIError(400, 'Invalid user ID format'));
      return;
    }
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new APIError(403, 'Access denied. Admin privileges required');
    }
    
    // Prevent deleting your own account
    if (req.user.id === userId) {
      throw new APIError(400, 'Cannot delete your own account');
    }
    
    // Delete user
    const result = await User.findByIdAndDelete(userId);
    if (!result) {
      throw new APIError(404, 'User not found');
    }

    res.status(204).send();
  } catch (error) {
    if (error.name === 'CastError') {
      next(new APIError(400, 'Invalid user ID format'));
      return;
    }
    next(error);
  }
});

// Change password route
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      throw new APIError(400, 'Current password and new password are required');
    }
    
    if (newPassword.length < 6) {
      throw new APIError(400, 'New password must be at least 6 characters long');
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError(404, 'User not found');
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new APIError(401, 'Current password is incorrect');
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    res.json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;