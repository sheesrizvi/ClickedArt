const mongoose = require('mongoose')

const ArtworkAnalyticsSchema = new mongoose.Schema({
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true }, 
    views: { type: Number, default: 0 }, 
    downloads: { type: Number, default: 0 }, 
    likes: { type: Number, default: 0 },
    comments: {type: Number, default: 0},
    shares: { type: Number, default: 0 }, 
    pulseScore: { type: Number, default: 0 }
  }, { timestamps: true })
  

const ArtworkAnalytics = mongoose.model('ArtworkAnalytics', ArtworkAnalyticsSchema)

module.exports = ArtworkAnalytics
