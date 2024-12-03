const mongoose = require("mongoose");

const typeSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String },
  type: { type: String, enum: ['Photographer', 'User'], required: true }
}, {
    timestamps: true
})

const UserType = mongoose.model('UserType', typeSchema)

module.exports = UserType