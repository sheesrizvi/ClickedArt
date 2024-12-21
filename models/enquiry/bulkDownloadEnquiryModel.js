const mongoose = require('mongoose')

const bulkenquirySchema = mongoose.Schema({
    user: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        company: { type: String },
        deliveryAddress: { 
            country: { type: String },
            address: { type: String }
         },
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
        enum: ['Pending', 'In Review', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending',
    },
})

const BulkEnquiry = mongoose.model('BulkEnquiry', bulkenquirySchema)

module.exports = BulkEnquiry