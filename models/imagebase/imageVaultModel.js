const mongoose = require("mongoose");
const validator = require('validator')

const imageVaultSchema = mongoose.Schema({
    category: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true
    },
    imageLinks: {
        thumbnail: { type: String },
        original: { type: String, required: true },
        medium: { type: String },
        small: { type: String },
      },
    resolutions: {
        thumbnail: {  width: { type: Number }, height: { type: Number }  },
        small: {  width: { type: Number }, height: { type: Number }  },
        medium: {  width: { type: Number }, height: { type: Number }  },
        original: {  width: { type: Number }, height: { type: Number }  },
    },
    title: {
        type: String
    },
    description: {
            type: String
        },
    story: {
            type: String
        },
    keywords: [
        {
            type: String,
            required: true
        }
    ],
    location: { 
        type: String
    },
    watermark: {
        type: Boolean,
        default: false
    },
    cameraDetails: {
        camera: { type: String, trim: true },
        lens: { type: String, trim: true },
        settings: {
          focalLength: { type: String, trim: true },
          aperture: { type: String, trim: true },
          shutterSpeed: { type: String, trim: true },
          iso: { type: Number },
        },
      },
    price: {
       original: { type: Number, required: true  },
       medium: { type: Number },
       small: { type: Number }
    },
    license: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "License",
    },
    exclusiveLicenseStatus: {
        type: String,
        default: 'pending',
        enum: ['pending', 'review', 'approved', 'rejected']
    },
    isActive: {
        type: Boolean,
        default: false
    },
    featuredArtwork: {
        type: Boolean,
        default: false
    },
    rejectionReason: [{
        type: String,
        trim: true,
        default: null
    }],
    notForSale: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})



const ImageVault = mongoose.model('ImageVault', imageVaultSchema)

module.exports = ImageVault