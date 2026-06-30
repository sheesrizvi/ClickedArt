const mongoose = require("mongoose");

const mountSchema = new mongoose.Schema(
  {
    thickness: {
      type: Number,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    initialBasePrice: {
      type: Number,
      required: true,
    },
    basePricePerUnit: {
      type: Number,
      required: true,
    },
    basePricePerLinearInch: {
      type: Number,
    },
    userDiscount: {
      type: Number,
      required: false,
      default: 0,
    },
    photographerDiscount: {
      type: Number,
      required: false,
      default: 0,
    },
    photographerFinalPrice: {
      type: Number,
      required: false,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

mountSchema.index({ isActive: 1 });

module.exports = mongoose.model("Mount", mountSchema);
