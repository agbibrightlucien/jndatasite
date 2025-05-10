const { body, validationResult } = require('express-validator');

// Validation middleware to check for validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules for authentication
const authValidationRules = {
  // Email validation
  email: body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  // Password validation
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),

  // Name validation for registration
  name: body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long')
};

// Validation chains for different routes
const validateLogin = [
  authValidationRules.email,
  authValidationRules.password,
  validate
];

const validateRegistration = [
  authValidationRules.name,
  authValidationRules.email,
  authValidationRules.password,
  validate
];

module.exports = {
  validateLogin,
  validateRegistration
};