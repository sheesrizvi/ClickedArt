const mongoose = require('mongoose')

const paperSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
      },
      image: {
        type: String
      },
      material: {
        type: String,
        required: true,
      },
      thickness: {
        type: Number, 
        required: true,
        default: 20,
      },
      basePricePerSquareInch: {
        type: Number, 
        required: true,
      },
      photographerDiscount:{
          type: Number,
          required: false
      },
      customDimensions: [
        {
          width: { type: Number, required: true }, 
          height: { type: Number, required: true }, 
          price: { type: Number, required: true }, 
        },
      ],
      active: {
        type: Boolean,
        default: true
      }
    },
    { timestamps: true }
  )
  
module.exports = mongoose.model("Paper", paperSchema)
  


