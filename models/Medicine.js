const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicineId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  genericName: String,
  category: {
    type: String,
    required: true
  },
  manufacturer: String,
  price: {
    type: Number,
    required: true
  },
  stockQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  expiryDate: Date,
  dosage: String,
  description: String,
  requiresPrescription: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Medicine', medicineSchema);