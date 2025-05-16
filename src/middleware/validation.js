const { body, validationResult } = require('express-validator');
const { isValidGhanaianPhone } = require('../utils/phoneValidation');

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

// Validation rules for vendor profile update
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .custom(value => {
      if (!isValidGhanaianPhone(value)) {
        throw new Error('Please enter a valid Ghanaian phone number (10 digits)');
      }
      return true;
    }),

  validate
];

// Validation rules for sub-vendor registration
const validateSubVendorRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .custom(value => {
      if (!isValidGhanaianPhone(value)) {
        throw new Error('Please enter a valid Ghanaian phone number (10 digits)');
      }
      return true;
    }),
  
  validate
];

module.exports = {
  validateLogin,
  validateRegistration,
  validateProfileUpdate,
  validateSubVendorRegistration
};