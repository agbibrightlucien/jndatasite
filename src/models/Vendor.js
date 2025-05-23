const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { isValidGhanaianPhone } = require('../utils/phoneValidation');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return isValidGhanaianPhone(v);
      },
      message: props => `${props.value} is not a valid Ghanaian phone number! Must be 10 digits.`
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  vendorLink: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  approved: {
    type: Boolean,
    default: false
  },
  parentVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  profit: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const { generateVendorLink } = require('../utils/uuid');

// Generate vendor link and hash password before saving
vendorSchema.pre('save', async function(next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    if (!this.vendorLink) {
      this.vendorLink = generateVendorLink();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
vendorSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;