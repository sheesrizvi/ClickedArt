const mongoose = require('mongoose');

const royaltySettingsSchema = mongoose.Schema({
    licensingType: {
        type: String,
        enum: ['exclusive'],
        required: true,
        default: 'exclusive'
    },
    rankWiseRoyaltyShare: {
        professional: {
            type: Number,
            default: 70
        },
        ambassador: {
            type: Number,
            default: 80
        },
        master: {
            type: Number,
            default: 100
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
