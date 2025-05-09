const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  subVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  dataBundle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataBundle',
    required: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  amountPaid: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'complete'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

orderSchema.virtual('profit').get(async function() {
  await this.populate('dataBundle');
  return this.amountPaid - this.dataBundle.basePrice;
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;