const mongoose = require('mongoose')

const canvasSchema = new mongoose.Schema(
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
        enum: ["glossy", "matte", "luster", "fine art", "canvas paper"],
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
      customDimensions: [
        {
          width: { type: Number, required: true }, 
          height: { type: Number, required: true }, 
          price: { type: Number, required: true }, 
        },
      ],
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    { timestamps: true }
  );
  
  module.exports = mongoose.model("Canvas", canvasSchema);
  


//   sizeOptions: [
//     {
//       sizeCategory: {
//         type: String,
//         enum: ["small", "medium", "large"], 
//         required: true,
//       },
//       dimensions: {
//         width: { type: Number, required: true }, 
//         height: { type: Number, required: true }, 
//       },
//       price: {
//         type: Number, 
//         required: true,
//       },
//     },
//   ]