const mongoose = require('mongoose')

const frameSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      material: {
        type: String,
        enum: ["wood", "metal", "plastic", "glass", "composite"],
        required: true,
      },
      style: {
        type: String,
        enum: ["classic", "modern", "ornate", "minimalist"],
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
          width: { type: Number, required: true }, 
          height: { type: Number, required: true }, 
          price: { type: Number, required: true }, 
        },
      ],
    },
    { timestamps: true }
  );
  
  module.exports = mongoose.model("Frame", frameSchema);
  