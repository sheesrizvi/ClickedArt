const mongoose = require("mongoose");

const termsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Terms and Conditions",
    },
    content: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

const Terms = mongoose.model("Terms", termsSchema);

module.exports = Terms;
