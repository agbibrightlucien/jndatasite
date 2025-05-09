const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  reference: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = PaymentTransaction;