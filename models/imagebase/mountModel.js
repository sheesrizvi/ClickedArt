const mongoose = require("mongoose");

const mountSchema = new mongoose.Schema(
  {
    thickness:{
      type: Number,
      required: true,
    },
    color: {
      type: String,
    },
    initialBasePrice: {
      type: Number,
      required: true,
    },
    basePricePerUnit: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    photographerDiscount: {
      type: Number,
      required: false,
    },
    userDiscount: {
      type: Number,
      required: false,
    },
    photographerFinalPrice: {
      type: Number,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mount", mountSchema);
