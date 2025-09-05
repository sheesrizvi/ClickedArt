const mongoose = require("mongoose");

const privacyPolicySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Privacy Policy",
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

const PrivacyPolicy = mongoose.model("PrivacyPolicy", privacyPolicySchema);

module.exports = PrivacyPolicy;