const nodemailer = require('nodemailer')
const asyncHandler =require('express-async-handler')
const generator = require('generate-password')
const dotenv = require('dotenv')



const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465, 
  secure: true, 

  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.USER_PASS,
  },
});



const verifyTransporter = asyncHandler(async (req, res, next) => {
  try {
    await transporter.verify();
    next();  
  } catch (error) {
    console.log(error)
    throw new Error('Email transporter verification failed');
  }
});



const sendResetEmail = asyncHandler(async(email) => {
  const password = Math.floor(100000 + Math.random() * 900000);
  
    const info = await transporter.sendMail({
      from: process.env.USER_EMAIL, 
      to: email, 
      subject: `Your OTP - PASSWORD`, 
      text: `Your OTP/Temporary Password for Login is ${password}`, 
      html: `<h4>OTP/Password is ${password}</h4>`, 
    });
    
    return password
    
  })


  const sendVerificationEmail = asyncHandler(async(otp, email) => {
    
    const info =  await transporter.sendMail({
      from: process.env.USER_EMAIL, 
      to: email, 
      subject: `Your OTP - PASSWORD`, 
      text: `Your OTP/Temporary Password for Login is ${otp}`, 
      html: `<h4>Verification OTP: ${otp}</h4>`, 
    });
    return true
    
  })

  module.exports = {
    sendResetEmail,
    verifyTransporter,
    sendVerificationEmail
  }