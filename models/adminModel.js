const mongoose = require("mongoose");
const validator = require('validator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const Schema = mongoose.Schema

const adminSchema = new Schema({
    name : {
        type: String,
        required: true,
        minlength: [5, 'Name must be minimum of 5 characters']
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate(value) {
            if(!validator.isEmail(value)) {
                throw new Error('Valid Email is Required')
            }
        }
    },
    password: {
        type: String,
        required: true
      },
    type: {
        type: String,
        required: true,
        default: "Admin",
        enum: ['Admin', 'finance', 'seo', 'print']
      }
}, {
    timestamps: true
})


adminSchema.pre('save', async function(next) {
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
  
  adminSchema.methods.isPasswordCorrect = async function(password) {
    const isMatch = await bcrypt.compare(password, this.password)
    return isMatch
  }
  
  adminSchema.methods.generateAccessToken = async function() {
    return await jwt.sign({ id: this._id, type: this.type, email: this.email, name: this.name }, process.env.SECRET_KEY)
  }
  

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin