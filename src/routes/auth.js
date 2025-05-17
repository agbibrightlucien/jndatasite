const express = require('express');
const router = express.Router();
const { APIError } = require('../middleware/errorHandler');
const authMiddleware = require('../middleware/auth');
const { verifyToken, generateToken } = require('../utils/jwt');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Login route
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new APIError(400, 'Email and password are required');
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw new APIError(401, 'Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id,
      role: user.role
    });

    // Return user data and token
    res.json({
      status: 'success',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register route
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      throw new APIError(400, 'Email, password, and username are required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        throw new APIError(400, 'Email already registered');
      } else {
        throw new APIError(400, 'Username already taken');
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      username
    });

    await user.save();

    // Generate JWT token
    const token = generateToken({
      id: user._id,
      role: user.role
    });

    // Return user data and token
    res.status(201).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Verify token route
router.get('/verify', authMiddleware, async (req, res, next) => {
  try {
    // Get full user data from database
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      throw new APIError(404, 'User not found');
    }
    
    res.json({
      status: 'success',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Request password reset route
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      throw new APIError(400, 'Email is required');
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return res.json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset link'
      });
    }
    
    // Generate reset token (valid for 1 hour)
    const resetToken = generateToken({
      id: user._id,
      purpose: 'password_reset'
    }, '1h');
    
    // In a real application, send an email with the reset link
    // For this implementation, just return the token
    res.json({
      status: 'success',
      message: 'If your email is registered, you will receive a password reset link',
      // In production, remove this and send via email instead
      resetToken
    });
  } catch (error) {
    next(error);
  }
});

// Reset password route
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      throw new APIError(400, 'Token and new password are required');
    }
    
    if (newPassword.length < 6) {
      throw new APIError(400, 'Password must be at least 6 characters long');
    }
    
    // Verify reset token
    let decoded;
    try {
      decoded = verifyToken(token);
      
      // Check if token was issued for password reset
      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token purpose');
      }
    } catch (error) {
      throw new APIError(401, 'Invalid or expired token');
    }
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new APIError(404, 'User not found');
    }
    
    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    res.json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;