const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  financialYear: { type: String, required: true, unique: true },
  counter: { type: Number, default: 0 },
});

const BuyerCounter = mongoose.model('BuyerCounter', counterSchema);

module.exports = BuyerCounter