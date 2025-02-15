const mongoose = require('mongoose');

const monetizationSchema = new mongoose.Schema({
    photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true,
    },
    photographerPhoto: {
        type: String,
        required: false
    },
    address:{
        residentialAddress: { type: String },
        state: { type: String }
    },
    governmentIdProof: {
        type: String
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
    bankName: {
        type: String,
        required: true
    },
    bankAccountName:{ 
        type: String,
        required: true
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
    isBusinessAccount: {
        type: Boolean,
        default: false
    },
    businessAccount: {
        businessDetailsInfo: {
            businessName: {
                type: String,
            },
            natureOfBusiness: {
                type: String,
            },
            businessAddress: {
                type: String,
            }
        },
        gstCopy: {
            type: String, 
            required: false,
        },
        firmPan: {
            type: String,
            required: false,
        },
        firmPanPhoto: {
            type: String,
            required: false
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
        gstState: {
            type: String,
            required: false
        },
        gstType: {
            type: String,
            required: false
        },
        businessAddressProof: {
            type: String,
            required: false
        }
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
