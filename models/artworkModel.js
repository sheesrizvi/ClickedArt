const mongoose = require("mongoose");
const validator = require('validator')

const artworkSchema = mongoose.Schema({
    category: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ArtworkCategory'
    }],
    photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true
    },
    imageLinks: {
        thumbnail: { type: String },
        original: { type: String, required: true },
      },
    resolutions: {
        thumbnail: {  width: { type: Number }, height: { type: Number }  },
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
       original: { type: Number  },
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
    },
    slug: {
        type: String
    },
    eventName: {
        type: String
    },
    eventEndDate: {
        type: Date
    },
    selectedForEvent: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    }
}, {
    timestamps: true
})



const Artwork = mongoose.model('Artwork', artworkSchema);

module.exports = Artwork;