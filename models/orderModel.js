const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userInfo: { 
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
        userType: { type: String, enum: ['User', 'Photographer'], required: true },
    },
    orderItems: [{ 
      imageInfo: {
        image: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ImageVault',
          },  
        photographer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Photographer',
        },
        resolution: {
          type: String,
          enum: ['original', 'medium', 'small'],
        },
        price: {
            type: Number,
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
       }
      },
      subTotal: {
        type: Number,
        required: true
      }, 
     finalPrice: {
        type: Number
      }
    }
    ],
   gst: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GST',
      required: false,
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed',
    },
    isPaid: {
      type: Boolean
    }, 
    paymentMethod: {
        type: String
    },
    invoiceId: {
        type: String,
      },
    totalAmount: {
        type: Number,
        required: true,
        },
     finalAmount: {
      type: Number,
      required: true
     },
    discount: {
      type: Number
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);


