const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// Admin registration route
router.post('/register', async (req, res) => {
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

module.exports = router;