const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true 
    },
    discountPercentage: { 
        type: Number, 
        required: true 
    },
    maxDiscountAmount: { 
        type: Number, 
        required: true 
    },
    applicableTo: { 
        type: String, 
        enum: ['user', 'photographer', 'both'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['active', 'expired', 'revoked'], 
        default: 'active' 
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
        required: true 
    },
    type: {
        type: String,
        enum: ['coupon'],
        default: 'coupon'
    },
    users: [{
            user: { type: mongoose.Schema.Types.ObjectId, refPath: 'users.userType' },
            userType: { type: String, enum: ['User', 'Photographer'] }
        }]
}, { timestamps: true })

module.exports = mongoose.model('Coupon', CouponSchema);
