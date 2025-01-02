const mongoose = require('mongoose')

const customWatermarkSchema = mongoose.Schema({
    watermarkImage: {
       type: String
    },
    photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer'
    }
})

const Watermark = mongoose.model('CustomWatermark', customWatermarkSchema)

module.exports = Watermark