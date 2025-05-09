const mongoose = require('mongoose');

const dataBundleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dataAmount: {
    type: String,
    required: true,
    trim: true
  },
  network: {
    type: String,
    required: true,
    trim: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

const DataBundle = mongoose.model('DataBundle', dataBundleSchema);

module.exports = DataBundle;