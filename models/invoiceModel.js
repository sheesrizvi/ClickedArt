const mongoose = require('mongoose')
const invoiceSchema = new mongoose.Schema(
    {
      photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true,
      },
      orderDetails: [{
          order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
          image: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageVault'},
          resolution: { type: String },
          originalPrice: { type: Number },
          royaltyAmount: { type: Number },
          royaltyWithGST: { type: Number },
          printcutAmount: { type: Number }
        } 
    ,],
    totalRoyaltyAmount: {type: Number},
    gst: {type: Number },
    tdsAmount: { type: Number },
    totalAmountPayable: {type: Number },
    totalPrintcutAmount: { type: Number },
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