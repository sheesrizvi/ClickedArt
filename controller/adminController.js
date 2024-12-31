const asyncHandler = require("express-async-handler")
const bcrypt = require('bcrypt')
const Admin  = require("../models/adminModel.js")


const adminRegistration = asyncHandler(async (req, res) => {
    const { name, email, password, type , role} = req.body
    if(name && email && password ) {
        const admin = new Admin({
            name,
            email,
            password,
            type: role || type
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
    const { name, email, password, type , role} = req.body
    if(name && email && password ) {
        if(type !== 'Admin') {
            throw new Error('Only Super Admin can create other admin')
        }
        const admin = new Admin({
            name,
            email,
            password,
            type: role 
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

module.exports = {
    adminRegistration,
    adminLogin,
    resetPassword,
    createOtherAdmin
}