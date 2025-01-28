const mongoose = require('mongoose')
const invoiceSchema = new mongoose.Schema(
    {
      invoiceId: { type: String, unique: true },
      startDate: { type: Date },
      endDate: { type: Date },
      photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photographer',
        required: true,
      },
      orderDetails: [{
          order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
          image: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageVault'},
          printPrice: { type: Number },
    paperInfo: {
      type: Object, 
      default: {}, 
    },
    frameInfo: {
      type: Object, 
      default: {}, 
    },      
    resolution: { type: String },
          originalPrice: { type: Number },
          royaltyAmount: { type: Number },
          printcutAmount: { type: Number }
        } 
    ,],
    pendingPrintDetails: [
      {
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        image: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageVault'},
        printPrice: { type: Number },
        paperInfo: {
          type: Object, 
          default: {}, 
        },
        frameInfo: {
          type: Object,
          default: {}, 
        },
        resolution: { type: String },
        originalPrice: { type: Number },
        royaltyAmount: { type: Number },
        printcutAmount: { type: Number }
      } 
    ],
    totalRoyaltyAmount: {type: Number},
    totalAmountPayable: {type: Number },
    totalPrintcutAmount: { type: Number },
    totalReferralAmount: { type: Number  },
    prevPendingPrintCutAmount: { type: Number },
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