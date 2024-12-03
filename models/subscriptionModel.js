const mongoose = require('mongoose');
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
    userInfo: { // primary user info
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
        userType: { type: String, enum: ['User', 'Photographer'], required: true },
    },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    price: { type: Number},
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true }, 
    isActive: { type: Boolean, default: true },
    autoRenew: { type: Boolean, default: false }, 
  }, {
    timestamps: true
  });
  
  module.exports = mongoose.model('Subscription', subscriptionSchema);
  