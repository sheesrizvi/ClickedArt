// models/CustomUploadImage.js

const mongoose = require('mongoose');

const customUploadImageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userType',
    required: true
  },
  userType: {
    type: String,
    enum: ['User', 'Photographer'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  name: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CustomUploadImageVault', customUploadImageSchema);
