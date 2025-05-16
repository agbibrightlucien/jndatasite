const mongoose = require('mongoose');
const { isValidGhanaianPhone } = require('../utils/phoneValidation');

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
    trim: true,
    validate: {
      validator: function(v) {
        return isValidGhanaianPhone(v);
      },
      message: props => `${props.value} is not a valid Ghanaian phone number! Must be 10 digits.`
    }
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

orderSchema.virtual('profit').get(async function() {
  await this.populate('dataBundle');
  return this.amountPaid - this.dataBundle.basePrice;
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;