const User = require("../models/userModel.js")
const asyncHandler = require("express-async-handler")
const bcrypt = require('bcrypt')
const { generateFromEmail } = require("unique-username-generator")
const Photographer = require('../models/photographerModel.js')
const UserType = require('../models/typeModel.js')
const { sendResetEmail } = require("../middleware/handleEmail.js");

const userRegistration = asyncHandler(async (req, res) => {
    const { name, email, password, address, age, dob, image, bio, interests } = req.body

    const username = generateFromEmail(
        name,
        2
    );
   
    if (name && email && password) {
        let user = new User({
            name,
            email,
            password,
            address,
            age,
            dob,
            username,
            image,
            bio,
            interests
        })
        await user.save()
        await UserType.create({
            user: user._id,
            username: user.username,
            type: user.type
        })
        const token = await user.generateAccessToken()
        res.status(201).json({
            status: true,
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                location: user.location,
                username: user.username,
                token
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
        if (user && (await user.isPasswordCorrect(password))) {
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

    const users = await User.find({}).sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)

    if(!users || users.length === 0) return res.status(400).send({ message: 'Users not found' })

    const totalDocuments = await User.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ users, pageCount  })
})

const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.query

    const user = await User.findOne({ _id: userId })

    if(!user) return res.status(400).send({ message: 'User not found' })

    res.status(200).send({ user })
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



module.exports = {
    userRegistration,
    userLogin,
    resetPassword,
    convertUserToPhotographer,
    getAllUsers,
    getUserById
}


