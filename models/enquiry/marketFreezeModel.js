const mongoose = require('mongoose');

const marketFreezeRequestSchema = new mongoose.Schema({
    user: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        company: { type: String },
        address: { 
            country: { type: String },
            address: { type: String }
         },
        
    },
    requestDetails: {
        tags: { type: [String] }, 
        categories: { type: [String] },
        freezeStartDate: { type: Date, required: true },
        freezeEndDate: { type: Date, required: true },
        purpose: { 
            type: String, 
            required: true, 
            enum: ['Personal', 'Commercial', 'Other'] 
        },
        additionalReason: { type: String },
    },
    status: {
        type: String,
        enum: ['pending', 'review', 'approved', 'rejected'],
        default: 'pending',
 },
}, { timestamps: true });

const MarketFreeze = mongoose.model('MarketFreezeRequest', marketFreezeRequestSchema)

module.exports = MarketFreeze
