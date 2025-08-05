const mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const PushToken = mongoose.model("PushToken", pushTokenSchema);
module.exports = PushToken;
