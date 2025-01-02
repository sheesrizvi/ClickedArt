const mongoose = require('mongoose')

const customWatermarkSchema = mongoose.Schema({
    watermarkImage: {
       type: String,
       required: true
    },
    photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true
    }
})

const Watermark = mongoose.model('CustomWatermark', customWatermarkSchema)

module.exports = Watermark