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

  const sendApprovedMail = asyncHandler(async (photographerName, email) => {
    const info = await transporter.sendMail({
        from: process.env.USER_EMAIL,
        to: email,
        subject: "Welcome to ClickedArt.com – Your Registration is Approved!",
        text: `
  Dear ${photographerName},

  Congratulations!

  Your registration on ClickedArt.com has been successfully approved. You are now a part of our growing community of talented photographers from around the globe. We are thrilled to have you on board and excited to see your creativity flourish!

  Here’s what you can do now:

  1. Upload Your Photos:
    - You can now upload your photos for approval directly from your profile page.
    - Our team will review them to ensure they meet our quality standards. Once approved, your work will be live on ClickedArt.com and ready for purchase by art enthusiasts and businesses worldwide.

  2. Monetization Request:
    - You can enable monetization for your account by submitting a request through your profile page.
    - This will allow you to start earning royalties on your digital downloads and print sales.

  We are committed to supporting your journey as a photographer and providing you with the tools to turn your creativity into opportunity. If you have any questions or need assistance, feel free to reach out to us at support@clickedart.com.

  Start uploading your masterpieces today and let the world discover your talent!

  Warm Regards,  
  Team ClickedArt.com  
  Empowering Photographers Everywhere
          `,
    });
    return true;
});

const sendRejectionEmail = asyncHandler(async (name, email, reasons = []) => {
  // Ensure 'reasons' is an array and map over it safely
  reasons = [
"Reason 1: Insufficient details in the application on form.",
"Reason 2: Supporting documents was incomplete or unclear."
  ]
  const formattedReasons = Array.isArray(reasons) && reasons.length > 0 
    ? reasons.map((reason) => `• ${reason}`).join("\n")
    : "No specific reasons provided.";

  const info = await transporter.sendMail({
    from: process.env.USER_EMAIL,
    to: email,
    subject: "Registration Update on ClickedArt.com",
    text: `
Dear ${name},

Thank you for your interest in joining ClickedArt.com. We truly appreciate your effort in registering with us and your enthusiasm to be a part of our community.

After reviewing your registration details, we regret to inform you that your application has not been approved at this time.

Reason(s) for Disapproval:
${formattedReasons}

You are welcome to re-apply for registration after 24 hours, ensuring that the concerns mentioned above are addressed. We highly value your interest and look forward to receiving your application again.

If you have any questions or need clarification regarding this decision, please don’t hesitate to contact us at support@clickedart.com. We are here to assist you in becoming a part of our vibrant photography community.

Warm Regards,  
Team ClickedArt.com  
Empowering Photographers Everywhere
    `,
  });

  return true;
});


  module.exports = {
    sendResetEmail,
    verifyTransporter,
    sendVerificationEmail,
    sendApprovedMail,
    sendRejectionEmail
  }