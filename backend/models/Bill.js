const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billId: {
    type: String,
    unique: true,
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  billDate: {
    type: Date,
    default: Date.now
  },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    amount: Number
  }],
  consultationFee: Number,
  medicineCharges: Number,
  otherCharges: Number,
  totalAmount: Number,
  financialToken: {
    tokenId: String,
    amount: { type: Number, default: 0 },
    description: String
  },
  netAmount: Number,
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Unpaid', 'Cancelled'],
    default: 'Unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Insurance', 'Online']
  },
  dailyCode: {
    providedCode: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date
  },
  dueDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bill', billSchema);