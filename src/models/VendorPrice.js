const mongoose = require('mongoose');

const vendorPriceSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  dataBundle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataBundle',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Create a compound index to ensure unique vendor-bundle pairs
vendorPriceSchema.index({ vendor: 1, dataBundle: 1 }, { unique: true });

const VendorPrice = mongoose.model('VendorPrice', vendorPriceSchema);

module.exports = VendorPrice;