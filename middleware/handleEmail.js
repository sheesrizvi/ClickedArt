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


const sendApprovedImageMail = asyncHandler(async (photographerName, email, imageTitle) => {
  const info = await transporter.sendMail({
      from: process.env.USER_EMAIL,
      to: email,
      subject: "Your Image on ClickedArt.com has been Approved!",
      text: `
Dear ${photographerName},

Congratulations!

Your image titled "${imageTitle}" has been successfully approved and is now live on ClickedArt.com. Your work is now available for purchase by art enthusiasts and businesses worldwide.

Here’s what you can do now:

1. Promote Your Work:
 - Share your approved image across your social media channels and website to attract potential buyers.
 - You can also add more images to your portfolio to increase your exposure.


We are excited to see your creativity flourishing on ClickedArt.com. If you have any questions or need assistance, feel free to reach out to us at support@clickedart.com.

Keep up the great work, and continue sharing your masterpieces with the world!

Warm Regards,  
Team ClickedArt.com  
Empowering Photographers Everywhere
      `,
  });
  return true;
});

const sendUnapprovedImageMail = asyncHandler(async (photographerName, email, imageTitle, reasons = ["Reason 1: Image quality did not meet our standards.", "Reason 2: Image was blurry or poorly lit.",]) => {


  const formattedReasons = Array.isArray(reasons) && reasons.length > 0 
      ? reasons.map((reason) => `• ${reason}`).join("\n")
      : "No specific reasons provided.";

  const info = await transporter.sendMail({
      from: process.env.USER_EMAIL,
      to: email,
      subject: "Update on Your Image Submission to ClickedArt.com",
      text: `
Dear ${photographerName},

Thank you for submitting your image titled "${imageTitle}" to ClickedArt.com.

After reviewing your image, we regret to inform you that it has not been approved at this time.

Reason(s) for Disapproval:
${formattedReasons}

You are welcome to make the necessary adjustments and re-upload the image. We encourage you to keep submitting your work, as we truly value your creativity and contributions to our platform.

If you need any clarification or assistance regarding the review process, feel free to reach out to us at support@clickedart.com. We are here to help.

Warm Regards,  
Team ClickedArt.com  
Empowering Photographers Everywhere
      `,
  });
  return true;
});


const sendMonetizationMail = asyncHandler(async (photographerName, email  ) => {


  const info = await transporter.sendMail({
      from: process.env.USER_EMAIL,
      to: email,
      subject: "Monetization Approved – Start Earning with ClickedArt.com!",
      text: `
Dear ${photographerName},
We are thrilled to inform you that your monetization request has been approved! You are 
now eligible to earn royalties for your work through ClickedArt.com. 
Royalty Model Details: 
Here’s how your earnings are calculated based on your membership plan: 
Basic User (Initial Membership) 
• Digital Download Sales: 50% of the sale value 
• Print Orders: 10% flat on the sale value 
Intermediate User (Upgrade Available) 
• Digital Download Sales: 70% of the sale value 
• Print Orders: 10% flat on the sale value 
Premium User (Upgrade Available) 
• Digital Download Sales: 90% of the sale value 
• Print Orders: 10% flat on the sale value 
Key Points to Note: 
• You are currently on the Basic Membership plan. To increase your royalty percentage, 
you can upgrade your membership from your profile page at any time. 
• Taxes such as TDS and other applicable government levies will be deducted as per 
norms. 
• You can track your sales, earnings, and payouts through your dashboard on 
ClickedArt.com. 
We are excited to help you showcase your creativity and turn your passion into a source of 
income. If you have any questions or need assistance, feel free to reach out to us 
at support@clickedart.com  
Congratulations again, and let’s create magic together! 
      `,
  });
  return true;
});


const sendMonetizationDisApprovalMail = asyncHandler(async (photographerName, email, reasons = [" Insufficient portfolio quality to meet our standards.", " Required verification documents were incomplete or unclear.",]  ) => {

  const formattedReasons = Array.isArray(reasons) && reasons.length > 0 
  ? reasons.map((reason) => `• ${reason}`).join("\n")
  : "No specific reasons provided.";

  const info = await transporter.sendMail({
      from: process.env.USER_EMAIL,
      to: email,
      subject: "Monetization Request Update",
      text: `
Dear ${photographerName},
Thank you for submitting your request for monetization on ClickedArt.com. After reviewing 
your application, we regret to inform you that your monetization request has not been 
approved at this time. 
Reason(s) for Disapproval: 
${formattedReasons}
You are welcome to re-apply for monetization after 24 hours, ensuring that the concerns 
mentioned above are addressed. We highly encourage you to review your portfolio and 
account details to strengthen your next application. 
If you need further assistance or clarification regarding this decision, please don’t hesitate to 
reach out to us at support@clickedart.com  
We appreciate your effort and dedication and look forward to assisting you in your journey as 
a creative photographer with ClickedArt.com  
Warm regards, 
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
    sendRejectionEmail,
    sendApprovedImageMail,
    sendUnapprovedImageMail,
    sendMonetizationMail,
    sendMonetizationDisApprovalMail
  }