const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  financialYear: { type: String, required: true, unique: true },
  counter: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter