const User = require("../models/userModel.js")
const asyncHandler = require("express-async-handler")
const bcrypt = require('bcrypt')
const { generateFromEmail } = require("unique-username-generator")
const Photographer = require('../models/photographerModel.js')
const UserType = require('../models/typeModel.js')
const { sendResetEmail, sendVerificationEmail } = require("../middleware/handleEmail.js");
const { differenceInYears, parseISO, isValid } = require('date-fns');
const Referral = require('../models/referralModel.js')

const userRegistration = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, mobile, whatsapp, shippingAddress, dob, image, interests, connectedAccounts, isMarried, anniversary, referralcode } = req.body
    console.log(referralcode)
    const username = generateFromEmail(
        firstName,
        2
    );

    const emailExist = await User.findOne({ email })
    if(emailExist) {
        return res.status(400).send({ message: 'Email already exist. Please use a different email' })
    }

    let age;
    if (dob) {
        const birthDate = parseISO(dob)
        if (isValid(birthDate)) {
            age = differenceInYears(new Date(), birthDate)
        } else {
            return res.status(400).send({ status: false, message: 'Invalid date of birth' });
        }
    }
    
    if(referralcode) {
        const now = Date.now()
        const referral = await Referral.findOne({ code: referralcode, status: 'active', expirationDate: { $gt: now } }).populate('photographer')
        if(!referral) {
            return res.status(400).send({ message: 'Referral Code is not valid' })
        }
    }

    if (firstName && email && password) {
        
        let user = new User({
            firstName,
            lastName,
            email,
            password,
            mobile,
            whatsapp,
            shippingAddress,
            age,
            dob,
            username,
            image,
            interests,
            connectedAccounts,
            isMarried,
            anniversary,
            referralcode
        })
        const otp = Math.floor(100000 + Math.random() * 900000);
        console.log(otp)
        await sendVerificationEmail(otp, email)

        user.otp = otp.toString()
        await user.save()
        
        await UserType.create({
            user: user._id,
            username: user.username,
            type: user.type,
        })
        
        res.status(201).json({
            status: true,
            message: 'Verification OTP sent to your email. Please verify your email for login',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
            }
        });
    } else {
        res.status(400).send({ status: false, message: 'All Fields are required' })
    }
})

const userLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (email && password) {
        let user = await User.findOne({ email })
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

const resetPassword = asyncHandler(async(req, res) => {
    const {  email } = req.body
    if(!email) {
        return res.status(400).send({status:true, message: 'Email not Found'})
    }
    const existedUser = await User.findOne({email})
    if(!existedUser) {
        return res.status(400).send({status: false, message: 'Email not exist'})
    }
    
    const randomPassword = await sendResetEmail(existedUser.email)
    existedUser.password = randomPassword
    await existedUser.save()
    res.status(200).send({status: true, message: 'OTP sent to your email. Please check for passwrod reset'})
  })

const getAllUsers = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const users = await User.find({ isActive: true }).sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)

    if(!users || users.length === 0) return res.status(400).send({ message: 'Users not found' })

    const totalDocuments = await User.countDocuments({ isActive: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ users, pageCount  })
})

const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.query

    const user = await User.findOne({ _id: userId })

    if(!user) return res.status(400).send({ message: 'User not found' })

    res.status(200).send({ user })
})

const userProfileUpdate = asyncHandler(async (req, res) => {
    const { userId, firstName, lastName, email, password, mobile, whatsapp, shippingAddress, dob, image, interests, connectedAccounts, isMarried, anniversary  } = req.body
    const user = await User.findOne({ _id: userId })
    if(!user) {
        return res.status(400).send({ message: 'User not found' })
    }
    user.firstName = firstName || user.firstName
    user.lastName = lastName || user.lastName
    user.password = password || user.password
    user.shippingAddress = shippingAddress || user.shippingAddress
    user.mobile = mobile || user.mobile
    user.whatsapp = whatsapp || user.whatsapp
    user.isMarried = isMarried 
    user.anniversary = anniversary || user.anniversary


    if(email && email !== user.email) {
        const emailExist = await User.findOne({ email })
        if(emailExist){
            return res.status(400).send({ message: 'Email already exist' })
        }
        user.email  = email
    }
    if(dob) {
        let age;
        if (dob) {
            const birthDate = parseISO(dob)
            if (isValid(birthDate)) {
                age = differenceInYears(new Date(), birthDate)
            } else {
                return res.status(400).send({ status: false, message: 'Invalid date of birth' });
            }
        }
        user.dob = dob
        user.age = age
    }

    user.image = image || user.image  
    user.interests = interests || user.interests
    user.connectedAccounts = connectedAccounts || user.connectedAccounts

    await user.save()

    res.status(200).send({ message: 'User updated successfully', user })
})


const convertUserToPhotographer = asyncHandler(async (req, res) => {

    const { userId, isCompany, companyName, companyEmail, companyAddress, companyPhone, portfolioLink, photographyStyles, yearsOfExperience, accountType } = req.body

    const user = await User.findById(userId)

    if (!user) {
        throw new Error('User not found');
    }
    if (user.photographer) {
        throw new Error('User is already a photographer');
    }


    const photographerData = {
        name: user.name,
        email: user.email,
        address: user.address,
        password: user.password,
        companyName: !companyName ? user.name : companyName,
        portfolioLink,
        photographyStyles,
        yearsOfExperience,
        accountType,
    }

    if (isCompany) {
        if (!companyName || !companyEmail || !companyPhone || !companyAddress) {
            throw new Error('Company details are required! Otherwise Please register as individual photographer')
        } else {
            photographerData.isCompany = isCompany
            photographerData.companyEmail = companyEmail,
            photographerData.companyAddress = companyAddress
            photographerData.companyPhone = companyPhone
        }
    }
    const photographer = new Photographer(photographerData);
    photographer.user = user._id
    await photographer.save();

    // user.photographer = photographer
    // await user.save() if admin don't approve then we will do that logic here as of now admin is doing that
    res.status(200).json({
        status: true,
        message: 'You need to wait till admin approves you as a Photographer'
    })

})


const deleteUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.query
    const user = await User.findOne({ _id: userId })
    if(!user) {
        return res.status(400).send({ message: 'user not exist' })
    }

    await User.findOneAndDelete({ _id: userId })
    res.status(200).send({ message: 'User deleted successfully' })
})

const verifyUserProfile = asyncHandler(async (req, res) => {
    const { email, otp } = req.body
  
    const user = await User.findOne({ email })
    if(!user) return res.status(400).send({message: 'User not found'})
  
    if(user.otp !== otp) return res.status(400).send({ message: 'OTP not valid' })
    user.isActive = true
    user.otp = ""
    await user.save()
    const token = await user.generateAccessToken()
    res.status(200).send({ message: 'User verified successfully', user, token })
  })

const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body
  
    const user = await User.findOne({ email })
    if(!user) return res.status(400).send({message: 'User not found'})
  
    const otp = Math.floor(100000 + Math.random() * 900000);

    await sendVerificationEmail(otp, email)

    user.otp = otp.toString()

    await user.save()
    
    res.status(200).send({ message: 'OTP resent successfully', user})
})

module.exports = {
    userRegistration,
    userLogin,
    resetPassword,
    convertUserToPhotographer,
    getAllUsers,
    getUserById,
    userProfileUpdate,
    deleteUserProfile,
    verifyUserProfile,
    resendOTP
}


