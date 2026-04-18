const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staffId: {
    type: String,
    unique: true,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Nurse', 'Receptionist', 'Technician', 'Pharmacist', 'Admin'],
    required: true
  },
  department: String,
  qualification: [String],
  joiningDate: {
    type: Date,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'Night']
  },
  salary: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Staff', staffSchema);