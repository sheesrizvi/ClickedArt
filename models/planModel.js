const mongoose = require('mongoose');
const { Schema } = mongoose;

const planSchema = new Schema({
  name: { type: String, required: true, unique: true },
  userType: { 
    type: String, 
    enum: ['user', 'photographer'], 
    required: true 
  },
  price: { type: Number, required: true }, 
  level: { type: Number, enum: [1, 2, 3, 4, 5], default: 1 },
  isAdFree: { type: Boolean, default: false },
  downloadLimit: { type: Number, default: null },
  priorityAccess: { type: Boolean, default: false }, 
  promotionalTools: { type: Boolean, default: false }, 
  analyticsAccess: { type: Boolean, default: false }, 
  allowedImageResolutions: [{ 
    type: String, 
    enum: ['original', 'standard', 'large', 'medium', 'small'] 
  }], 
  duration: { 
    type: String, 
    enum: ['monthly', 'quaterly', 'half-yearly', 'yearly'], 
    required: true 
  }, 
  description: { type: String }, 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Plan', planSchema);
