const mongoose = require('mongoose')

const ReferralBalanceSchema = new mongoose.Schema({
    photographer: { type: mongoose.Schema.Types.ObjectId, ref: 'Photographer', required: true },
    amount: { type: Number, required: true }
}, {
    timestamps: true
})

const ReferralBalance = mongoose.model('ReferralBalance', ReferralBalanceSchema)

module.exports = ReferralBalance