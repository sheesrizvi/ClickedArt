const mongoose = require('mongoose')

const ImageAnalyticsSchema = new mongoose.Schema({
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageVault', required: true }, 
    views: { type: Number, default: 0 }, 
    downloads: { type: Number, default: 0 }, 
    likes: { type: Number, default: 0 },
    comments: {type: Number, default: 0},
    shares: { type: Number, default: 0 }, 
    pulseScore: { type: Number, default: 0 },
  }, { timestamps: true });
  

const ImageAnalytics = mongoose.model('ImageAnalytics', ImageAnalyticsSchema)

module.exports = ImageAnalytics