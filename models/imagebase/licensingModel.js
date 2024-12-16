const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Personal', 'Commercial', 'Editorial', 'Exclusive', 'Extended'],
        required: true
    },
    purpose: {
        type: String,
        required: true,
    },
    commonUses: {
        type: [String],
        required: true,
    },
    restrictions: {
        type: String,
        default: '',
    },
    approxPrice: {
        type: Number,
    },
    scopeOfUse: {
        type: String,
        default: 'General use',
    },
    duration: {
        type: String,
        default: 'Perpetual',
    },
    geographicLimitations: {
        type: String,
        default: 'Global',
    },
    canModify: {
        type: Boolean,
        default: false,
    },
    attributionRequired: {
        type: Boolean,
        default: false,
    },
})

const License = mongoose.model('License', licenseSchema);


module.exports = License