const mongoose = require('mongoose')
const invoiceSchema = new mongoose.Schema(
    {
      photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true,
      },
      orderDetails: [{
          order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
          image: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageVault', required: true },
          resolution: { type: String, required: true },
          originalPrice: { type: Number, required: true },
          royaltyAmount: { type: Number, required: true },
          royaltyWithGST: { type: Number, required: true },
          printcutAmount: { type: Number, required: true }
        } 
    ,],
    totalRoyaltyAmount: {type: Number, required: true,},
    gst: {type: Number, required: true },
    totalAmountPayable: {type: Number, required: true, },
    totalPrintcutAmount: { type: Number, required: true },
    totalReferralAmount: { type: Number  },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending',
      },
    },
    {
      timestamps: true,
    }
  );
  

const Invoice = mongoose.model('Invoice', invoiceSchema)

module.exports = Invoice