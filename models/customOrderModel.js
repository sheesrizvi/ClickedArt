// models/CustomImageOrder.js

const mongoose = require('mongoose');

const customImageOrderSchema = new mongoose.Schema({
 userInfo: { 
      user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
      userType: { type: String, enum: ['User', 'Photographer'], required: true },
  },
  orderItems: [{ 
        imageInfo: {
          image: {
              type: String
            }, 
          user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
          },
      },
      frameInfo: {
        frame: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Frame',
        },
        price: {
         type: Number,
        },
        size: {
         width: { type: Number },
         height: { type: Number }
        },
        initialPrice: {
          type: Number
        },
        discount: {
          type: Number
        }
       },
       paperInfo: {
        paper: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Paper'
        },
        price: {
          type: Number,
        },
        size: {
          width: { type: Number },
          height: { type: Number }
         },
        initialPrice: {
          type: Number
        },
        discount: {
          type: Number
        }
        },
        subTotal: {
          type: Number,
          required: true
        }, 
       finalPrice: {
          type: Number
        },
        sgst: {
          type: Number,
        },
        cgst: {
          type: Number,
        },
        totalGST: {
          type: Number
        }
      }
      ],
  quantity: {
    type: Number,
    default: 1
  },
 orderStatus: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'failed'],
      default: 'pending',
    },
  printStatus: {
      type: String,
      enum: ['no-print', 'processing', 'printing', 'packed', 'shipped', 'delivered', 'returned'],
      default: 'no-print'
    },
  isPaid: {
      type: Boolean,
      default: true
    }, 
  paymentMethod: {
        type: String
    },
  invoiceId: {
        type: String,
      },
  invoiceNumber: {
      type: String
    },
  totalAmount: {
      type: Number,
      required: true,
    },
  finalAmount: {
      type: Number,
      required: true
     },
  shippingAddress: {
        address: { type: String, },
        country: { type: String },
        city: { type: String,  },
        landmark: { type: String, },
        area: { type: String,  },
        mobile: { type: Number, },
        email: { type: String,  },
        pincode: { type: String, },
        state: { type: String },
      },
    waybill: {
        type: String,
        required: false
      },
    readyToShip: {
        type: Boolean,
        default: false
      },
    readyToShipTimeStamp: {
        type: Date,
      },
    pickupId: {
        type: Number
      }

}, {
  timestamps: true
});

module.exports = mongoose.model('CustomImageOrder', customImageOrderSchema);
