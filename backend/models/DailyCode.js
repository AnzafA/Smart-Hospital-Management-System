const mongoose = require('mongoose');

const dailyCodeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient date queries
dailyCodeSchema.index({ date: 1 });

module.exports = mongoose.model('DailyCode', dailyCodeSchema);