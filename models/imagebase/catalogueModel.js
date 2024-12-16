const mongoose = require('mongoose')

const catalogueSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    photographer: { type: mongoose.Schema.Types.ObjectId, ref: 'Photographer', required: true },
    images: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ImageVault'
     }]
}, {
    timestamps: true
})

module.exports = mongoose.model('Catalogue', catalogueSchema);
