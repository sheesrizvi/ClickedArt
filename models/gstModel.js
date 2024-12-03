const mongoose = require('mongoose');

const gstSchema = new mongoose.Schema({
  userInfo: { // primary user info
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
        userType: { type: String, enum: ['User', 'Photographer'], required: true },
    },
  gstNumber: {
    type: String,
    minlength: 15,
    maxlength: 15,
    match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/,
    sparse: true,
  },
  registeredName: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    default: 'India',
  },
  pinCode: {
    type: String,
    match: /^[1-9][0-9]{5}$/,
  },
  gstType: {
    type: String,
    enum: ['CGST', 'SGST', 'IGST', 'UTGST'],
    required: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'reviewed', 'rejected'],
    default: 'pending',
  },
  rejectionReason: {
    type: String
  }
}, {
    timestamps: true
});

module.exports = mongoose.model('GST', gstSchema);
