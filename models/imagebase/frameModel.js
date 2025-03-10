const mongoose = require('mongoose')

const frameSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
      },
      image: [{
        type: String,
      }],
      material: {
        type: String,
        required: true,
      },
      style: {
        type: String,
        required: true,
      },
      thickness: {
        type: Number, 
        required: true,
        default: 10,
      },
      basePricePerLinearInch: {
        type: Number, 
        required: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      features: {
        glassProtection: { type: Boolean, default: false }, 
        matting: { type: Boolean, default: false }, 
      },
      customDimensions: [
        {
          width: { type: Number }, 
          height: { type: Number }, 
          price: { type: Number }, 
        },
      ],
      active: {
        type: Boolean,
        default: true
      }
    },
    { timestamps: true }
  );
  
  module.exports = mongoose.model("Frame", frameSchema);
  