const mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  source: {
    type: String,
    enum: ["UserApp", "PhotographerApp", "Web", "Other"],
    required: true,
  },
  platform: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const PushToken = mongoose.model("PushToken", pushTokenSchema);
module.exports = PushToken;
