const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true 
    },
    photographer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Photographer'
    },
    salesuser: {
        type: mongoose.Schema.Types.String,
        required: false
    },
    commissionRate: {
        type: Number,
        required: true,
        default: 5
    },
    discountPercentage: {
        type: Number,
        required: true
    },
    maxUses: { 
        type: Number, 
        default: 0 
    },
    usageCount: { 
        type: Number, 
        default: 0 
    },
    expirationDate: { 
        type: Date, 
        required: false 
    },
    maxDiscountAmount: {
        type: Number,
        default: null
    },
    status: { 
        type: String, 
        enum: ['active', 'expired', 'revoked'], 
        default: 'active' 
    },
    applicableTo: { 
        type: String, 
        enum: ['user', 'photographer'], 
        required: true 
    },
    type: {
        type: String,
        enum: ['referral'],
        default: 'referral'
    },
    users: [{
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'users.userType' },
        userType: { type: String, enum: ['User', 'Photographer'] }
    }],
    isSalesUser: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

module.exports = mongoose.model('Referral', ReferralSchema);
