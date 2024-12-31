const asyncHandler = require("express-async-handler")
const bcrypt = require('bcrypt')
const Admin  = require("../models/adminModel.js")


const adminRegistration = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body
    if(name && email && password ) {
        const admin = new Admin({
            name,
            email,
            password,
        })
        const savedAdmin = await admin.save()
        const token = await savedAdmin.generateAccessToken()
        res.status(201).json({
            status: true,
            message: 'Admin created successfully',
            user: {
              id: savedAdmin._id,
              name: savedAdmin.name,
              email: savedAdmin.email,
              token
             
            }
          });
    } else {
        res.status(400).send({ status: false, message: 'All Fields are required'})
    }
})

const adminLogin = asyncHandler(async (req, res) => {
    const {email, password} = req.body
    if(email && password) {
        let admin = await Admin.findOne({email})
        if (admin && (await admin.isPasswordCorrect(password))) {
            admin.password = undefined;
            const token = await admin.generateAccessToken()
            res.json({
             status: true,
             admin,
             token
            });
           } else {
              res.status(400);
             throw new Error("Invalid credentials");
           }
    }})

const resetPassword = asyncHandler(async(req, res) => {
        const {  email } = req.body
        if(!email) {
            return res.status(400).send({status:true, message: 'Email not Found'})
        }
        const existedAdmin = await Admin.findOne({email})
        if(!existedAdmin) {
            return res.status(400).send({status: false, message: 'Email not exist'})
        }
        const randomPassword = await sendResetEmail()
        existedAdmin.password = randomPassword
        await existedAdmin.save()
        res.status(200).send({status: true, message: 'Check Your Email for Password Reset'})
    })

const createOtherAdmin = asyncHandler(async (req, res) => {
    const { name, email, password, type } = req.body
    if(name && email && password && type) {
       
        const admin = new Admin({
            name,
            email,
            password,
            type 
        })
        const savedAdmin = await admin.save()
        const token = await savedAdmin.generateAccessToken()
        res.status(201).json({
            status: true,
            message: 'Admin created successfully',
            user: {
              id: savedAdmin._id,
              name: savedAdmin.name,
              email: savedAdmin.email,
              token
             
            }
          });
    } else {
        res.status(400).send({ status: false, message: 'All Fields are required'})
    }
})

const getAllAdmins = asyncHandler(async (req, res) => {
    const admins = await Admin.find({})

    if(!admins || admins.length === 0) {
        throw new Error('No Admin Found')
    }

    res.status(200).send({ admins })
})

const getAdminById = asyncHandler(async (req, res) => {
    const { adminId } = req.query

    const admin = await Admin.findOne({ _id: adminId })
    
    if(!admin) {
        throw new Error('Admin not found')
    }
    res.status(200).send({ admin })
})

const updateOtherAdmin = asyncHandler(async (req, res) => {
    const { type,  id, name, email, password } = req.body


    const admin = await Admin.findById({ _id: id })
    if(!admin){
        throw new Error('Admin not found')
    }

    admin.name = name || admin.name
    if(email) {
        const emailExists = await Admin.findOne({ email: email, _id: { $ne: id } })
        if (emailExists) {
            throw new Error('Email already in use by another admin');
        }
        admin.email = email;
    }
    admin.email = email || admin.email
    admin.type = type || admin.type
    admin.password = password || admin.password
    await admin.save()

    res.status(200).send({ admin })

})

const updateSuperAdmin = asyncHandler(async (req, res) => {
    const {  id, name, email , password } = req.body
    const admin = await Admin.findById({ _id: id })

    if(!admin){
        throw new Error('Admin not found')
    }

    admin.name = name || admin.name
    if(email) {
        const emailExists = await Admin.findOne({ email: email, _id: { $ne: id } })
        if (emailExists) {
            throw new Error('Email already in use by another admin');
        }
        admin.email = email;
    }
    admin.password = password || admin.password 
    await admin.save()

    res.status(200).send({ admin })
    
})

module.exports = {
    adminRegistration,
    adminLogin,
    resetPassword,
    createOtherAdmin,
    getAllAdmins,
    getAdminById,
    updateOtherAdmin,
    updateSuperAdmin
}