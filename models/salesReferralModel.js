const mongoose = require("mongoose");
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const salesUserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Valid Email is Required')
      }
    }
  },
  password: {
    type: String,
    required: true
  },
  mobile: {
    type: Number
  },
  whatsapp: {
    type: Number
  },
  image: {
    type: String,
    required: false
  },
  type: {
    type: String,
    enum: ['SalesUser'],
    default: "SalesUser",
    required: true
  },
  pushToken: {
    type: String,
  },
  otp: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: false
  },
  referralcode: {
    type: String
  }
}
  , {
    timestamps: true
  })


salesUserSchema.index({ name: 'text', username: 'text', email: 'text' });


salesUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {

    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

salesUserSchema.methods.isPasswordCorrect = async function (password) {
  const isMatch = await bcrypt.compare(password, this.password)
  return isMatch
}

salesUserSchema.methods.generateAccessToken = async function () {
  return await jwt.sign({ id: this._id, type: this.type, email: this.email, name: this.name }, process.env.SECRET_KEY)
}
const SalesUser = mongoose.model('SalesUser', salesUserSchema)

module.exports = SalesUser
