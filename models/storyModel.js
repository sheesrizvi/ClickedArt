const mongoose = require('mongoose')

const storySchema = mongoose.Schema({
    title: {
        type: String
    },
    description: {
        type: String
    },
    media_url: {
        type: String
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        default: null
    },
    expiration_time: {
        type: Date
    }
}, { timestamps: true })

const Story = mongoose.model('Story', storySchema)

module.exports = Story