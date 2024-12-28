const mongoose = require("mongoose");
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: [5, 'Name must be minimum of 5 characters']
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
  age: {
    type: Number
  },
  bio: {
    type: String,
    required: false
  },
  image: {
    type: String,
    required: false
  },
  dob: {
    type: Date,
    required: false
  },
  username: {
    type: String,
  },
  accountType: {
    type: String,
    enum: ['regular', 'premium', 'business', 'influencer'],
    required: true,
    default: 'regular'
  },
  type: {
    type: String,
    enum: ['User'],
    default: "User",
    required: true
  },
  connectedAccounts: [{
    accountName: { type: String },
    accountLink: { type: String }
  }],
  interests: [
   {type: String,
    required: false}
  ],
  photographer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photographer',
    default: null
  },
  shippingAddress: {
    address: { type: String,  },
    country: { type: String },
    city: { type: String,  },
    landmark: { type: String, },
    area: { type: String,  },
    mobile: { type: Number },
    email: { type: String,  },
    pincode: { type: String, },
    state: { type: String },
  },
  pushToken: {
    type: String,
  },
}
  , {
    timestamps: true
  })


userSchema.index({ name: 'text', username: 'text', email: 'text' });


userSchema.pre('save', async function (next) {
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

userSchema.methods.isPasswordCorrect = async function (password) {
  const isMatch = await bcrypt.compare(password, this.password)
  return isMatch
}

userSchema.methods.generateAccessToken = async function () {
  return await jwt.sign({ id: this._id, type: this.type, email: this.email, name: this.name }, process.env.SECRET_KEY)
}
const User = mongoose.model('User', userSchema)

module.exports = User