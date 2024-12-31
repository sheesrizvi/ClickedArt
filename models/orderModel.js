const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userInfo: { // primary user info
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
        userType: { type: String, enum: ['User', 'Photographer'], required: true },
    },
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
        quantity: {
          type: Number
        },
        totalPrice: {
          type: Number
        }
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
    gst: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GST',
      required: false,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
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
