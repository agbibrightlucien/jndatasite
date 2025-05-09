const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  amountRequested: {
    type: Number,
    required: true,
    min: 0
  },
  mobileMoneyNumber: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

module.exports = Withdrawal;