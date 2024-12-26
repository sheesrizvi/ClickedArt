const mongoose = require('mongoose')

const bulkenquirySchema = mongoose.Schema({
    userInfo: { 
            user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
            userType: { type: String, enum: ['User', 'Photographer'], required: true },
    },
    orderDetails: {
        orderType: { 
            type: String, 
            required: true, 
            enum: ['Print', 'Digital', 'Both'] 
        },
        quantity: { type: Number, required: true }, 
        preferredDate: { type: Date, required: true },
        budget: { type: Number } 
    },
    enquiryDetails: {
        imageSpecifications: {
            resolutions: { type: [String] }, // Low/Medium/High 
            categories: { type: [String] }, 
        },
        mediaTypePreference: {
            paperTypes: { type: [String] }, 
            frameTypes: { type: [String] }, 
            frameColors: { type: [String] }, 
            packagingPreferences: { type: String }, 
            deliveryMethod: { type: String }, 
        },
    },
    status: {
        type: String,
        enum: ['pending', 'review', 'approved', 'rejected'],
        default: 'pending',
    },
})

const BulkEnquiry = mongoose.model('BulkEnquiry', bulkenquirySchema)

module.exports = BulkEnquiry