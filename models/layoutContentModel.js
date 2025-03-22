const mongoose = require('mongoose')

const layoutContentSchema = new mongoose.Schema({
    logo: {
        type: String,
        required: true
    },
    heroSectionPhotos: [{
        image: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageVault' },
        link: { type: String }
    }],
    footerDetails: {
        address: {
            type: String,
            required: true
        },
        phone: {
            type: String, 
            required: true
        },
        footerImage: {
            type: String
        },
        footerlinks: [
            {
              accountName: { type: String },
              accountLink: { type: String }  
            }
        ],
        email: {
            type: String
        },
        content: {
            title: { type: String, required: true },
            body:  { type: String, required: true }
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
    ],
    support: [
        {
            title: { type: String },
            url: { type: String },
            thumbnail: { type: String },
            tags: [{ type: String }]
        }
    ]
})

const LayoutContent = mongoose.model('LayoutContent', layoutContentSchema)

module.exports = LayoutContent