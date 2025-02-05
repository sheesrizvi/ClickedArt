const SalesUser = require('../models/salesReferralModel.js')
const UserType = require('../models/typeModel.js')
const asyncHandler = require('express-async-handler')
const { sendResetEmail, sendVerificationEmail } = require("../middleware/handleEmail.js");

const registerSalesUser = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, mobile, whatsapp, image } = req.body

    const emailExist = await SalesUser.findOne({ email })
    if(emailExist) {
        return res.status(400).send({ message: 'Email already exist' })
    }

   const user = new SalesUser({
        firstName,
        lastName,
        email,
        password,
        mobile,
        whatsapp,
        image
    })

    const otp = Math.floor(100000 + Math.random() * 900000)
    await sendVerificationEmail(otp, email)

    user.otp = otp.toString()

    await user.save()
    
    await UserType.create({
        user: user._id,
        type: 'SalesUser',
    })
    

    res.status(200).send({ user })
})

const updateSalesUser = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, mobile, whatsapp, image } = req.body

    const emailExist = await SalesUser.findOne({ email })
    if(emailExist) {
        return res.status(400).send({ message: 'Email already exist' })
    }

   const user = await SalesUser.findOne({ email })

   user.firstName = firstName || user.firstName
   user.lastName = lastName || user.lastName
   user.email = email || user.email
   user.password = password || user.password
   user.mobile = mobile || user.mobile
   user.image = image || user.image
   user.whatsapp = whatsapp || user.whatsapp

    await user.save()
    
    res.status(200).send({ user })
})

const userLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (email && password) {
        let user = await SalesUser.findOne({ email })
        if (user && (await user.isPasswordCorrect(password)) && user.isActive) {
            user.password = undefined;
            const token = await user.generateAccessToken()
            res.json({
                status: true,
                user,
                token
            });
        } else {
            res.status(400);
            throw new Error("Invalid credentials");
        }
    }
})

const getAllSalesUser = asyncHandler(async (req, res) => {

    const users = await SalesUser.find({ isActive: true })
    res.status(200).send({ users })
})

const getSalesUserById = asyncHandler(async (req, res) => {
    const { id } = req.query

    const salesuser = await SalesUser.findOne({ _id: id })

    res.status(200).send({ salesuser })
})

const verifySalesUserProfile = asyncHandler(async (req, res) => {
    const { email, otp } = req.body
  
    const user = await SalesUser.findOne({ email })
    if(!user) return res.status(400).send({message: 'User not found'})
  
    if(user.otp !== otp) return res.status(400).send({ message: 'OTP not valid' })
    user.isEmailVerified = true
    user.otp = ""
    user.isActive = true
    await user.save()
   
    res.status(200).send({ message: 'Photographer email verified successfully. We will let u know once admin will approve you as a Photographer', user: user })
  })

  
module.exports = {
    registerSalesUser,
    updateSalesUser,
    userLogin,
    getAllSalesUser,
    getSalesUserById,
    verifySalesUserProfile
}