const mongoose = require('mongoose');

const royaltySettingsSchema = mongoose.Schema({
    licensingType: {
        type: String,
        enum: ['exclusive'],
        required: true,
        default: 'exclusive'
    },
    planWiseRoyaltyShare: {
        basic: {
            type: Number,
            default: 50
        },
        intermediate: {
            type: Number,
            default: 70
        },
        premium: {
            type: Number,
            default: 90
        }
    },
    printRoyaltyShare: {
        type: Number,
        default: 10
    },
    sizePricingModifiers: {
        medium: { 
            type: Number,
            default: -30,
        },
        small: { 
            type: Number,
            default: -50,
        },
    },
    watermarkImage: {
        type: String
    }
}, {
    timestamps: true
});

const RoyaltySettings = mongoose.model('RoyaltySettings', royaltySettingsSchema);

module.exports = RoyaltySettings;
