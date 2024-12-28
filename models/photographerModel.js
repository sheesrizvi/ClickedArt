const mongoose = require("mongoose");
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const photographerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: [5, 'Name must be a minimum of 5 characters']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Valid Email is Required');
      }
    }
  },
  password: {
    type: String,
    required: true
  },
  dob: {
    type: Date,
    required: false
  },
  bio: {
    type: String,
    required: false
  },
  age: {
    type: Number
  },
  mobile: {
    type: Number
  },
  whatsapp: {
    type: Number
  },
  profileImage: {
    type: String,
    required: false
  },
  username: {
    type: String,
  },
  portfolioLink: {
    type: String,
    required: false
  },
  // photography styles specialization -> portrait, landscape
  photographyStyles: [
    {
      type: String,
      required: false
    }
  ],
  yearsOfExperience: {
    type: Number,
    required: false
  },
  photosCount: {
    type: Number,
    default: 0
  },
  accountType: {
    type: String,
    enum: ['freelance', 'studio', 'agency'],
    required: true,
    default: 'freelance'
  },
  isCompany: {
    type: Boolean,
    required: true,
    default: false
  }
  ,
  companyName: {
    type: String,
    required: true,
    default: this.name
  },
  companyEmail: {
    type: String, 
    unique: true, 
    required: function() { 
        return this.isCompany 
    },
    validate(value) {
        if(this.isCompany && !validator.isEmail(value)) {
            throw new Error('Valid Email is Required')
        }
    },
   
  },
  companyPhone: {
    type:Number
  },
  companyAddress: {
    type: String,
    required: function() { 
        return this.isCompany; 
    }
  },
  certifications: [
    {
      title: { type: String, required: false },
      issuedBy: { type: String, required: false },
      issueDate: { type: Date, required: false }
    }
  ],
  connectedAccounts: [
    {
      accountName: { type: String },
      accountLink: { type: String }
    }
  ],
  pushToken: {
    type: String
  },
  active: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['Photographer'],
    default: 'Photographer'
  },
  rank: {
    type: String, 
    enum: ['master', 'influencer', 'ambassador'],
    default: 'master'
  },
  photographerStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        required: true,
        default: 'pending'
    },
    rejectedAt: {
        type: Date,
        default: null,
        index: {expires: '7d'}
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
  featuredArtist: {
      type: Boolean,
      default: false
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
}, {
  timestamps: true
});


photographerSchema.pre('save', async function (next) {
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

photographerSchema.methods.isPasswordCorrect = async function (password) {
  const isMatch = await bcrypt.compare(password, this.password);
  return isMatch;
};

photographerSchema.methods.generateAccessToken = async function () {
  return await jwt.sign({ id: this._id, email: this.email, name: this.name, type: this.type }, process.env.SECRET_KEY);
};

const Photographer = mongoose.model('Photographer', photographerSchema);

module.exports = Photographer;
