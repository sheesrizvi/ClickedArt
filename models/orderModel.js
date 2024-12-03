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
            required: true,
          },  
        photographer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Photographer',
            required: true
        },
        resolution: {
            type: String,
            enum: ['original', 'medium', 'small'],
            required: true,
          },
        price: {
            type: Number,
            required: true,
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
    canvasInfo: {
      canvas: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Canvas'
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
        address: { type: String, required: true },
        city: { type: String, required: true },
        landmark: { type: String, required: true },
        area: { type: String, required: true },
        mobileNumber: { type: Number, required: true },
        email: { type: String, required: true },
        pincode: { type: String, required: true },
        state: { type: String },
      },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
