const mongoose = require('mongoose')

const customRequestSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    requestType: {
        type: String,
        enum: ['Photography', 'Print', 'Both Print and Digital', 'Others']
    },
    requestDescription: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'review', 'approved', 'rejected'],
        default: 'pending',
    },
})

const CustomRequest = mongoose.model('CustomRequest', customRequestSchema)

module.exports = CustomRequest