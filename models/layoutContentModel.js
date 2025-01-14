const mongoose = require('mongoose')

const layoutContentSchema = new mongoose.Schema({
    logo: {
        type: String,
        required: true
    },
    heroSection: {
        type: [String],
        required: true
    },
    footerDetails: {
        address: {
            type: String,
            required: true
        },
        phone: {
            type: String, 
            required: true
        }
    },
    testimonials: [
        {
            name: { type: String },
            image: { type: String },
            designation: { type: String },
            message: { type: String },
            stars: { type: Number, min: 1, max: 5 }
        }
    ]
})

const LayoutContent = mongoose.model('LayoutContent', layoutContentSchema)

module.exports = LayoutContent