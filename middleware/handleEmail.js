const nodemailer = require('nodemailer')
const asyncHandler =require('express-async-handler')
const generator = require('generate-password')
const dotenv = require('dotenv')
const { S3Client } = require("@aws-sdk/client-s3");
const { S3 } = require("@aws-sdk/client-s3");
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');

const config = {
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
};

const s3 = new S3Client(config);

const transporter = nodemailer.createTransport({
  // service: "gmail",
  host: "smtpout.secureserver.net",
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
      from: `Clicked Art ${process.env.USER_EMAIL}`, 
      to: email, 
      subject: `Your OTP - PASSWORD`, 
      text: `Your OTP/Temporary Password for Login is ${password}`, 
      html: `<h4>OTP/Password is ${password}</h4>`, 
    });
    
    return password
    
  })


const sendVerificationEmail = asyncHandler(async(otp, email) => {
    
    const info =  await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`, 
      to: email, 
      subject: `Your One-Time Password (OTP) for Login`, 
      text: `
  Hello,

  We’ve generated a One-Time Password (OTP) for your account to help you log in securely.

  Your OTP/Temporary Password is: ${otp}

Please note:

  This OTP is valid only for one-time use.
  Keep it confidential and do not share it with anyone.
  Once you’ve logged in, we recommend changing your password to ensure your account’s security.
  If you didn’t request this OTP, please contact us immediately.
  We’re here to assist if you have any questions or need help.

  Team ClickedArt.com  
  www.clickedart.com
  support@clickedart.com
  Empowering Photographers Everywhere

  P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
        `, 
     
    });
    return true
    
  })

  const sendApprovedMail = asyncHandler(async (photographerName, email) => {
    const info = await transporter.sendMail({
        from: `Clicked Art ${process.env.USER_EMAIL}`,
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
  www.clickedart.com
  support@clickedart.com
  Empowering Photographers Everywhere

  P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
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
    from: `Clicked Art ${process.env.USER_EMAIL}`,
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
  www.clickedart.com
  support@clickedart.com
  Empowering Photographers Everywhere

  P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
    `,
  });

  return true;
});

const sendApprovedImageMail = asyncHandler(async (photographerName, email, imageTitle) => {
  const info = await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`,
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
  www.clickedart.com
  support@clickedart.com
  Empowering Photographers Everywhere

  P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
      `,
  });
  return true;
});

const sendUnapprovedImageMail = asyncHandler(async (photographerName, email, imageTitle, reasons = ["Reason 1: Image quality did not meet our standards.", "Reason 2: Image was blurry or poorly lit.",]) => {


  const formattedReasons = Array.isArray(reasons) && reasons.length > 0 
      ? reasons.map((reason) => `• ${reason}`).join("\n")
      : "No specific reasons provided.";

  const info = await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`,
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
www.clickedart.com
support@clickedart.com
Empowering Photographers Everywhere

P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
      `,
  });
  return true;
});


const sendMonetizationMail = asyncHandler(async (photographerName, email  ) => {


  const info = await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`,
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

Warm Regards,  
Team ClickedArt.com  
www.clickedart.com
support@clickedart.com
Empowering Photographers Everywhere

P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
      `,
  });
  return true;
});


const sendMonetizationDisApprovalMail = asyncHandler(async (photographerName, email, reasons = [" Insufficient portfolio quality to meet our standards.", " Required verification documents were incomplete or unclear.",]  ) => {

  const formattedReasons = Array.isArray(reasons) && reasons.length > 0 
  ? reasons.map((reason) => `• ${reason}`).join("\n")
  : "No specific reasons provided.";

const info = await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`,
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
www.clickedart.com
support@clickedart.com
Empowering Photographers Everywhere

P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
      `,
  });
  return true;
});

const setApprovedImageOfMonetizedProfile = asyncHandler(async (photographerName, email, imageTitle) =>{
const info = await transporter.sendMail({
    from: `Clicked Art ${process.env.USER_EMAIL}`,
    to: email,
    subject: "Your Photo Has Been Approved and is Ready for Sale! ",
    text: `
 Dear ${photographerName},

  We are excited to inform you that your recently uploaded photo titled ${imageTitle} has been approved! 
  It is now live on your ClickedArt.com profile and available for purchase by buyers. 

WHAT HAPPENS NEXT? 

  • Digital Sales: Earn up to [50%/70%/90%] on digital downloads, depending on your membership 
  tier. 
  • Print Sales: Receive a flat 10% royalty on every printed copy sold. 
  • You can monitor your sales, earnings, and buyer interactions on your [Dashboard Link]. 

BOOST YOUR VISIBILITY 

  • Share your ClickedArt profile link on social media to attract potential buyers. 
  • Regularly upload high-quality photos to expand your portfolio and increase your chances of 
  sales. 
  Thank you for being part of ClickedArt.com! Your creativity inspires us all. 

  Warm regards, 
  Team ClickedArt.com 
  www.clickedart.com
  support@clickedart.com
  Empowering Photographers Everywhere

P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
    `,
});
return true;
})

const setApprovedImageOfNonMonetizedProfile = asyncHandler(async (photographerName, email, imageTitle) => {
const info = await transporter.sendMail({
    from: `Clicked Art ${process.env.USER_EMAIL}`,
    to: email,
    subject: " Your Photo Has Been Approved By ClickedArt! ",
    text: `
Dear ${photographerName},

  We are excited to inform you that your recently uploaded photo titled ${imageTitle} has been approved! 

  What’s Next? 

  • Your approved photo is now visible in your catalog on ClickedArt.com. 
  • Currently, it is available for browsing by buyers, but since your monetization is pending 
  approval, it is not yet available for sale. 

Apply for Monetization 

  To enable sales and start earning royalties, please apply for monetization from your profile 
  page. Here’s how: 

  1. Log in to your account on ClickedArt.com. 
  2. Navigate to your profile page. 
  3. Click the “Apply for Monetization” button and follow the instructions. 

Once monetization is approved, your approved photos will be listed for sale, and you’ll earn 
royalties based on your user tier: 

  • Basic User: 50% on digital downloads, 10% on print orders 
  • Intermediate User: 70% on digital downloads, 10% on print orders 
  • Premium User: 90% on digital downloads, 10% on print orders 

  For any assistance, feel free to contact us at support@clickedart.com. 

  Thank you for being a valued part of the ClickedArt community. We can’t wait to see you 
  thrive! 

  Warm regards, 
  Team ClickedArt.com 
  www.clickedart.com
  support@clickedart.com
  Empowering Photographers Everywhere 

P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
    `,
});
return true;
})


const sendUnapprovedImageMailOfMonetizedProfile = asyncHandler(async (photographerName, email, imageTitle, reasons = ["Reason 1: Image quality did not meet our standards.", "Reason 2: Image was blurry or poorly lit.",]) => {


const formattedReasons = Array.isArray(reasons) && reasons.length > 0 
      ? reasons.map((reason) => `• ${reason}`).join("\n")
      : "No specific reasons provided.";

const info = await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`,
      to: email,
      subject: "Your Photo Upload Requires Revisions ",
      text: `
Dear ${photographerName},

Thank you for submitting your image titled "${imageTitle}" to ClickedArt.com.

Upon review, we regret to 
inform you that your submission did not meet our platform's guidelines and has been rejected.

Reason(s) for Disapproval:
${formattedReasons}

NEXT STEPS: 

You can revise your photo and re-upload it for review. To avoid future rejections, please adhere to the 
following guidelines: 

    • Ensure the resolution is at least 250 DPI and the minimum size is 2000 x 2500 pixels. 
    • Avoid watermarks, logos, or text overlays. 
    • Provide accurate metadata (title, description, keywords). 

NEED ASSISTANCE? 

Our team is here to help! If you have questions about the rejection or need support, feel free to reach out to 
us at support@clickedart.com  

We value your contribution to ClickedArt.com and look forward to seeing your updated submission soon. 

Warm regards, 
Team ClickedArt.com 
www.clickedart.com
support@clickedart.com
Empowering Photographers Everywhere

P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
      `,
  });
  return true;
});


const sendUnapprovedImageMailOfNonMonetizedProfile = asyncHandler(async (photographerName, email, imageTitle, reasons = ["Reason 1: Image quality did not meet our standards.", "Reason 2: Image was blurry or poorly lit.",]) => {


  const formattedReasons = Array.isArray(reasons) && reasons.length > 0 
      ? reasons.map((reason) => `• ${reason}`).join("\n")
      : "No specific reasons provided.";

  const info = await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`,
      to: email,
      subject: "Update on Your Photo Upload",
      text: `
Dear ${photographerName},

  Thank you for sharing your work with ClickedArt.com. .

  After careful review, we regret to 
  inform you that your uploaded photo, ${imageTitle}, could not be approved due to the 
  following reason(s): 
  ${formattedReasons}

Next Steps 

  Please address the issues mentioned above and re-upload the photo after 24 hours for review. 
  To ensure approval, make sure your photo meets the following guidelines: 

Technical Requirements 

  • Upload photos in JPEG or PNG format. 
  • Ensure the resolution is at least 300 DPI for print-quality images. 
  • Minimum dimensions: 2000 x 2500 pixels (or equivalent aspect ratio). 
  • File size should be between 5 MB to 50 MB. 

Content Standards 

  • Only upload original work; plagiarism or copyright infringement is strictly prohibited. 
  • Avoid images with watermarks, logos, or text overlays. 
  • Ensure the photo does not contain offensive, explicit, or illegal content. 
  • Photos should not depict or promote violence, hatred, or discrimination. 
  • Wildlife and nature photos must adhere to ethical practices (e.g., no baiting or staged 
  wildlife shots). 
Aesthetic and Quality Requirements 
  • Images should be sharp and free from excessive noise, blurriness, or over-processing. 
  • Avoid over-saturation or unnatural color corrections. 
  • Composition should be visually appealing and follow basic photography rules (e.g., 
  rule of thirds, leading lines). 
  • No visible branding or distracting elements in the frame unless it's part of the subject 
  (e.g., product photography). 

Metadata and Descriptions 

  • Provide accurate titles, descriptions, and keywords for each photo. 
  • Avoid misleading tags or keywords to ensure proper categorization. 
  • Ensure the title and description are free of grammatical errors and typos. 
  Legal and Ethical Compliance 
  • Obtain necessary model or property releases for photos featuring identifiable people 
  or private property. 
  • Respect privacy rights—do not upload images taken without consent in private 
  settings. 
  • Do not upload photos that violate local laws or community standards. 
  Additional Tips 
  • Photos with unique perspectives or storytelling elements are more likely to attract 
  buyers. 
  • Experiment with lighting, angles, and post-processing to make your work stand out. 
  • Upload high-quality series or collections to increase your chances of bulk sales 

Monetization Reminder 

  Once your photos are approved, you can apply for monetization to start earning royalties for 
  your work. To apply: 

  1. Log in to your account. 
  2. Navigate to your profile page. 
  3. Click “Apply for Monetization” and complete the process. 

  If you have questions or need help, feel free to reach out at support@clickedart.com. 
  We appreciate your efforts and look forward to seeing more of your creative work! 

  Warm regards, 
  Team ClickedArt.com 
  www.clickedart.com
  support@clickedart.com
  Empowering Photographers Everywhere

  P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
      `,
  });
  return true;
});


const sendMembershipUpgradeMail = asyncHandler(async (photographerName, membershipType, email) => {

  const info = await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`,
      to: email,
      subject: "Welcome to Your Upgraded Membership on ClickedArt.com!",
      text: `
Dear ${photographerName},

Congratulations on upgrading your membership to ${membershipType}! We’re thrilled to have you unlock a new level of opportunities and benefits designed to elevate your photography journey with ClickedArt.com.

________________________________________
Here’s What Your Upgrade Brings You:

1. Higher Earnings:
    • Intermediate Membership: Earn 70% royalty on digital downloads and 10% flat royalty on print orders.
    • Premium Membership: Earn 90% royalty on digital downloads and 10% flat royalty on print orders.

2. Enhanced Tools and Features:
    • Unlimited Catalog Creation: Showcase your creativity without any restrictions.
    • Social Media Auto-Posting: Seamlessly share your uploaded photos on your social media profiles to gain visibility.
    • Watermarking Tool: Protect your images with a professional watermark while promoting your brand.
    • Priority Support: Enjoy faster assistance and dedicated customer support.

3. Exclusive Marketing Support:
    • Marketing Campaigns: Intermediate and Premium members receive targeted exposure in our promotional efforts, giving your photos greater reach and visibility.

4. Advanced Insights:
  • Analytics Dashboard: Access in-depth analytics to track your performance, downloads, and customer preferences to fine-tune your offerings.

________________________________________
What’s Next?

Start exploring these benefits today:
    1. Maximize Your Exposure: Update your catalog with your best works.
    2. Engage with the Tools: Use watermarking, analytics, and social media auto-posting to strengthen your brand.
    3. Grow Your Earnings: Reach out to your audience and let them know about your upgraded profile.

  ________________________________________
Thank you for choosing ClickedArt.com as your partner in your photography journey. Together, let’s turn your passion into profit and showcase your creativity to the world!

If you have any questions or need further assistance, feel free to contact us at support@clickedart.com.

Warm Regards,
Team ClickedArt
www.clickedart.com
support@clickedart.com
  ________________________________________
P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
      `,
  });
  return true;
});


const sendOrderThankYouMail = asyncHandler(async (customerName, orderDate, items, customerEmail, s3Link, orderId) => {
  // const itemList = items.map(item => `  o ${item.name}`).join('\n');
  let response 
  if(s3Link) {
    response = await axios.get(s3Link, { responseType: 'arraybuffer' });
  }

  const info = await transporter.sendMail({
      from: `Clicked Art ${process.env.USER_EMAIL}`,
      to: customerEmail,
      subject: "Thank You for Your Order on ClickedArt.com!",
      text: `
Dear ${customerName},

Thank you for placing your order with ClickedArt.com! We are thrilled to have you as part of our community that celebrates creativity and artistry.

________________________________________
Order Details:
• Order Date: ${orderDate}
• Items Purchased:
${items} ...

You can view your complete order details and download any digital purchases directly from your Order History Page.

________________________________________
What Happens Next?
• Digital Downloads:
  For digital purchases, your files will be ready to download under your account section.
• Print Orders:
  If you've ordered printed photos, rest assured that our team has started processing your order. You'll receive a tracking link once the item is shipped.

________________________________________
Need Assistance?
If you have any questions about your order, feel free to reach out to us at support@clickedart.com.

________________________________________
We hope you love your purchase and enjoy showcasing the incredible talent of our photographers! Thank you for supporting creativity and contributing to our mission of bringing unique art to life.

Warm Regards,
Team ClickedArt
www.clickedart.com
support@clickedart.com

________________________________________
P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
      `,
      attachments: [
        {
            filename: 'order-details.pdf', 
            content: response?.data,
            contentType: 'application/pdf', 
        },
    ],
  });
  return true;
});


const sendMembershipRenewalReminderMail = asyncHandler(async (photographerName, email) => {

  const info = await transporter.sendMail({
    from: `Clicked Art ${process.env.USER_EMAIL}`,
    to: email,
    subject: "Your Membership with ClickedArt.com is Expiring Soon – Renew Today!",
    text: `
Dear ${photographerName},

We hope you’ve been enjoying your membership on ClickedArt.com! We’re writing to let you know that your current membership is set to expire soon. 

Don’t let your benefits lapse—renew your membership today to continue accessing the tools, features, and opportunities that help elevate your photography journey.

________________________________________
Why Renew Your Membership?

1. **Higher Earnings**:
   • Intermediate Membership: Earn 70% royalty on digital downloads and 10% flat royalty on print orders.
   • Premium Membership: Earn 90% royalty on digital downloads and 10% flat royalty on print orders.

2. **Enhanced Tools and Features**:
   • Unlimited Catalog Creation: Showcase your creativity without any restrictions.
   • Social Media Auto-Posting: Seamlessly share your uploaded photos on your social media profiles to gain visibility.
   • Watermarking Tool: Protect your images with a professional watermark while promoting your brand.
   • Priority Support: Enjoy faster assistance and dedicated customer support.

3. **Exclusive Marketing Support**:
   • Marketing Campaigns: Intermediate and Premium members receive targeted exposure in our promotional efforts, giving your photos greater reach and visibility.

4. **Advanced Insights**:
   • Analytics Dashboard: Access in-depth analytics to track your performance, downloads, and customer preferences to fine-tune your offerings.

________________________________________
How to Renew?

It’s easy to renew your membership! Simply:
  1. Visit your membership dashboard on [ClickedArt.com](https://www.clickedart.com).
  2. Select “Renew Membership” under your profile settings.
  3. Complete the renewal process and continue enjoying your benefits.

________________________________________
Act Now to Secure Your Benefits!

  Renew soon to ensure uninterrupted access to everything you love about ClickedArt.com.

  If you have any questions or need assistance, please don’t hesitate to contact us at support@clickedart.com. We’re here to help!

  Warm Regards,  
  Team ClickedArt  
  [www.clickedart.com](https://www.clickedart.com)  
  support@clickedart.com  

  P.S. Follow us on https://www.instagram.com/clickedartofficial/ for updates, featured artwork, and more inspiring photos from our talented photographers!
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
    sendMonetizationDisApprovalMail,
    setApprovedImageOfMonetizedProfile,
    setApprovedImageOfNonMonetizedProfile,
    sendUnapprovedImageMailOfMonetizedProfile,
    sendUnapprovedImageMailOfNonMonetizedProfile,
    sendMembershipUpgradeMail,
    sendOrderThankYouMail,
    sendMembershipRenewalReminderMail
  }