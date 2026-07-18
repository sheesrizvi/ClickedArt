const mongoose = require("mongoose");
const validator = require('validator');

const artworkSchema = mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ArtworkCategory'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true
    },
    photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer'
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
        type: Number
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
    isApproved: {
        type: Boolean,
        default: false
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

artworkSchema.virtual('orientation').get(function() {
    if (this.resolutions && this.resolutions.original) {
        const { width, height } = this.resolutions.original;
        if (width && height) {
            if (width > height) return 'Landscape';
            if (width < height) return 'Portrait';
            return 'Square';
        }
    }
    return null;
});

artworkSchema.set('toJSON', { virtuals: true });
artworkSchema.set('toObject', { virtuals: true });

const Artwork = mongoose.model('Artwork', artworkSchema);

module.exports = Artwork;
