const mongoose = require('mongoose');

const royaltySettingsSchema = mongoose.Schema({
    licensingType: {
        type: String,
        enum: ['exclusive'],
        required: true,
        default: 'exclusive'
    },
    royaltyShare: {
        type: Number,
        default: 70
    },
    sizePricingModifiers: {
        medium: { 
            type: Number,
            required: true,
            default: -30,
        },
        small: { 
            type: Number,
            required: true,
            default: -50,
        },
    }
}, {
    timestamps: true
});

const RoyaltySettings = mongoose.model('RoyaltySettings', royaltySettingsSchema);

module.exports = RoyaltySettings;
