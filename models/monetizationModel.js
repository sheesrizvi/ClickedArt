const mongoose = require('mongoose');

const monetizationSchema = new mongoose.Schema({
    photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true,
    },
    panPhoto: {
        type: String, 
        required: true,
    },
    panNumber: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    bankAccNumber: {
        type: String,
        required: true,
    },
    ifsc: {
        type: String,
        required: true,
    },
    branch: {
        type: String,
        required: true,
    },
    passbookOrCancelledCheque: {
        type: String, 
        required: true,
    },
    businessAccount: {
        gstCopy: {
            type: String, 
            required: false,
        },
        firmPan: {
            type: String,
            required: false,
        },
        firmGstCertificate: {
            type: String, 
            required: false,
        },
        gstNumber: {
            type: String, 
            required: function() {
                return !!this.businessAccount.firmGstCertificate;
            },
        },
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
}, {
    timestamps: true
});

const Monetization = mongoose.model('Monetization', monetizationSchema);

module.exports = Monetization;
