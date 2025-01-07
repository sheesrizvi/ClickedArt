const asyncHandler = require("express-async-handler")
const User = require("../models/userModel.js")
const Photographer = require('../models/photographerModel.js')
const { generateFromEmail } = require("unique-username-generator")
const UserType = require('../models/typeModel.js')
const { sendResetEmail, sendVerificationEmail } = require("../middleware/handleEmail.js");
const { differenceInYears, parseISO, isValid } = require('date-fns');
const ImageVault = require('../models/imagebase/imageVaultModel.js')
const Referral = require('../models/referralModel.js')

const registerPhotographer = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, mobile, whatsapp, bio, dob, profileImage, shippingAddress, isCompany, companyName, companyEmail, companyAddress, companyPhone, portfolioLink, photographyStyles, yearsOfExperience, accountType, connectedAccounts, expertise, awards ,achievements, bestPhotos, referralcode } = req.body

    if(!firstName || !email || !password  ) {
        return res.status(400).json({status: false, message: 'All Fields are required'})
    }

    const existingPhotographer = await Photographer.findOne({ email });
    if (existingPhotographer) {
        return res.status(400).json({status: false,  message: "Email already exist" });
    }

    const username = generateFromEmail(
        firstName,
        4
    );
    
    let age;
    if (dob) {
        const birthDate = parseISO(dob)
        if (isValid(birthDate)) {
            age = differenceInYears(new Date(), birthDate)
        } else {
            return res.status(400).send({ status: false, message: 'Invalid date of birth' });
        }
    }


    const photographerData = {
        firstName, email, username, password, 
        companyName: !companyName ? firstName : companyName
    }

    if(isCompany) {
        if(!companyName || !companyEmail || !companyAddress || !companyPhone) {
            throw new Error('Company details are required! Otherwise Please registered as freelancer')
        } else {
            photographerData.isCompany = isCompany
            photographerData.companyAddress = companyAddress
            photographerData.companyPhone = companyPhone
        }
    } 

    if(referralcode) {
            const now = Date.now()
            const referral = await Referral.findOne({ code: referralcode, status: 'active', expirationDate: { $gt: now } }).populate('photographer')
            if(!referral) {
                return res.status(400).send({ message: 'Referral Code is not valid' })
            }
        }

    const photographer = new Photographer({
        firstName, lastName,  email, username, password, shippingAddress, bio, dob, age, profileImage, portfolioLink,
        mobile, whatsapp, 
        yearsOfExperience,
        accountType,
        photographyStyles,
        companyName: !companyName ? firstName : companyName,
        isCompany: photographerData.isCompany,
        companyEmail: !companyEmail ?  email : companyEmail,
        companyAddress: photographerData.companyAddress || undefined, 
        companyPhone: photographerData.companyPhone,
        connectedAccounts,
        expertise, awards ,achievements, bestPhotos,
        referralcode
    });

    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(otp)
    await sendVerificationEmail(otp, email)

    photographer.otp = otp.toString()
    await photographer.save()

   
    await UserType.create({
        user: photographer._id,
        username: photographer.username,
        type: photographer.type
    })

   

    res.status(201).json({
        status: true,
        message: 'Verification OTP sent to your email. Please verify your email for login.',
        _id: photographer._id,
        email: photographer.email
    }); 
})

const updatePhotographer = asyncHandler(async (req, res) => {
    const { 
        photographerId,
        firstName, lastName,
        email, 
        password, 
        bio, 
        dob,
        mobile,
        whatsapp, 
        profileImage, 
        shippingAddress, 
        isCompany, 
        companyName, 
        companyEmail, 
        companyAddress, 
        companyPhone, 
        portfolioLink, 
        photographyStyles, 
        yearsOfExperience, 
        accountType, 
        connectedAccounts,
        expertise, awards ,achievements, bestPhotos
    } = req.body;


    const photographer = await Photographer.findById(photographerId);
    if (!photographer) {
        return res.status(404).json({ status: false, message: 'Photographer not found' });
    }

    if (email && email !== photographer.email) {
        const existingPhotographer = await Photographer.findOne({ email });
        if (existingPhotographer) {
            return res.status(400).json({ status: false, message: 'Email already exists' });
        }
    }

    if (firstName && firstName !== photographer.firstName) {
        const username = generateFromEmail(firstName, 4);
        photographer.username = username;
    }

    let age;
    if (dob) {
        const birthDate = parseISO(dob);
        if (isValid(birthDate)) {
            age = differenceInYears(new Date(), birthDate);
            photographer.dob = dob;
            photographer.age = age;
        } else {
            return res.status(400).json({ status: false, message: 'Invalid date of birth' });
        }
    }
   

    if (isCompany !== undefined && isCompany !== photographer.isCompany) {
        photographer.isCompany = isCompany;
        if (isCompany) {
            if (!companyName || !companyEmail || !companyAddress || !companyPhone) {
                return res.status(400).json({ status: false, message: 'Company details are required!' });
            }
            photographer.companyName = companyName;
            photographer.companyEmail = companyEmail;
            photographer.companyAddress = companyAddress;
            photographer.companyPhone = companyPhone;
        } else {
            photographer.companyName = photographer.name;
            photographer.companyEmail = photographer.email;
            photographer.companyAddress = undefined;
            photographer.companyPhone = undefined;
        }
    }
    if(firstName) photographer.firstName = firstName
    if(lastName) photographer.lastName = lastName
    if(email) photographer.email = email
    if(bio) photographer.bio = bio;
    if(profileImage) photographer.profileImage = profileImage;
    if(shippingAddress) photographer.shippingAddress = shippingAddress;
    if(portfolioLink) photographer.portfolioLink = portfolioLink;
    if(photographyStyles) photographer.photographyStyles = photographyStyles;
    if(yearsOfExperience) photographer.yearsOfExperience = yearsOfExperience;
    if(accountType) photographer.accountType = accountType;
    if(connectedAccounts) photographer.connectedAccounts = connectedAccounts;
    if(password) photographer.password = password
    if(mobile) photographer.mobile = mobile
    if(whatsapp) photographer.whatsapp = whatsapp
    if(expertise) photographer.expertise = expertise
    if(awards) photographer.awards = awards
    if(achievements) photographer.achievements = achievements
    if(bestPhotos) photographer.bestPhotos = bestPhotos

    await photographer.save();

    res.status(200).json({
        status: true,
        message: 'Photographer updated successfully',
        photographer
    });
});

const photographerLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if(email && password) {
        let photographer = await Photographer.findOne({email})
        if (photographer && (await photographer.isPasswordCorrect(password)) && photographer.isEmailVerified) {
            if(photographer.photographerStatus === 'pending' || photographer.photographerStatus === 'rejected') {
                throw new Error('Sorry! You need to wait till admin approval')
            }
            photographer.password = undefined;
            const token = await photographer.generateAccessToken()
            res.status(200).json({
             status: true,
             message: 'Photogphotographer Login Successful',
             photographer,
             token
            });
           } else {
              res.status(400);
             throw new Error("Invalid credentials");
           }
    }
})

const handlePhotographerStatusUpdate = asyncHandler(async (req, res) => {
   
    const { action, photographerId } = req.body
   
 
    const photographer = await Photographer.findById(photographerId)
    if(!photographer) {
     return res.status(400).send({status: false, message: 'Photographer not Found'})
    }
    const validStatusTypes = new Set(['approved', 'rejected']);
 
     if (!validStatusTypes.has(action?.toLowerCase())) {
         return res.status(400).json({status: false,  message: "Invalid Action" });
     }
 
     if(action === 'approved') {
         photographer.photographerStatus = 'approved',
         photographer.active = true
         photographer.rejectedAt = null
         if(photographer.user){
             const user = await User.findById(photographer.user)
             user.photographer = photographer._id
             await user.save()
         }
     } else if (action === 'rejected') {
         photographer.photographerStatus = 'rejected',
         photographer.rejectedAt = new Date()
     } else {
         return res.status(400).json({status: false, message: "Invalid Action"})
     }
     await photographer.save()
     await photographer.generateAccessToken()
     res.status(200).json({status: true, message: `Photographer got ${action}`})
 })

 const resetPassword = asyncHandler(async(req, res) => {
    const {  email } = req.body
    if(!email) {
        return res.status(400).send({status:true, message: 'Email not Found'})
    }
    const existedUser = await Photographer.findOne({email})
    if(!existedUser) {
        return res.status(400).send({status: false, message: 'Email not exist'})
    }
    
    const randomPassword = await sendResetEmail(existedUser.email)
    existedUser.password = randomPassword
    await existedUser.save()
    res.status(200).send({status: true, message: 'OTP sent to your email. Please check for passwrod reset'})
  })

const getAllPhotographers = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const photographers = await Photographer.find({ active: true }).sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)

    if(!photographers || photographers.length === 0) return res.status(400).send({ message: 'Photographers not found' })

    const totalDocuments = await Photographer.countDocuments({ active: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ photographers, pageCount  })
})

const getPhotographerById = asyncHandler(async (req, res) => {
    const { photographerId } = req.query

    const photographer = await Photographer.findOne({ _id: photographerId })

    if(!photographer) return res.status(400).send({ message: 'Photographer not found' })

    res.status(200).send({ photographer })
})

const getAllPendingPhotographersForAdmin = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const photographers = await Photographer.find({ photographerStatus: 'pending' }).sort({
        createdAt: - 1
    }).skip((pageNumber - 1) * pageSize).limit({ pageSize })

    if(!photographers || photographers.length === 0) {
        res.status(404)
        throw new Error('Photographer not found')
    }

    const totalDocuments = await Photographer.countDocuments({ active: false })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ photographers, pageCount })

})


const updatePhotographerRank = asyncHandler(async (req, res) => {
    const { rank, photographerId } = req.body

    const validRank = ['master', 'professional', 'ambassador']

    if (!rank) {
        return res.status(400).send({ message: 'Rank is required' });
    }

    if(!validRank.includes(rank)){
        return res.status(400).send({ message: 'Rank is not valid' })
    }
    const photographer = await Photographer.findOne({ _id: photographerId })

    if(!photographer) {
        return res.status(400).send({ message: 'Photographer not found' })
    }
    photographer.rank = rank

    await photographer.save()

    res.status(200).send({ message: 'Photographer Rank updated' })
})

const toggleFeaturedPhotographer = asyncHandler(async (req, res) => {
    const { photographerId } = req.body
    
    const photographer = await Photographer.findOne({_id: photographerId })

    if(!photographer){
        throw new Error('Photographer not found')
    }
    photographer.featuredArtist = !photographer.featuredArtist

    await photographer.save()

    res.status(200).send({  message: 'Featured Photographer toggle successfully' })
})

const getFeaturedPhotographer = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const [ featuredPhotographer, totalDocuments ] = await Promise.all([
        Photographer.find({ featuredArtist: true }).sort({ createdAt: -1 }).skip((pageNumber -1) * pageSize).limit(pageSize),
        Photographer.countDocuments({ featuredArtist: true })
    ])

    if(!featuredPhotographer || featuredPhotographer.length === 0) {
        return res.status(400).send({  message: 'Featured Photographer not found' })
    }
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({  featuredPhotographer, pageCount })
})

const verifyPhotographerProfile = asyncHandler(async (req, res) => {
    const { email, otp } = req.body
  
    const user = await Photographer.findOne({ email })
    if(!user) return res.status(400).send({message: 'User not found'})
  
    if(user.otp !== otp) return res.status(400).send({ message: 'OTP not valid' })
    user.isEmailVerified = true
    user.otp = ""
    await user.save()
   
    res.status(200).send({ message: 'Photographer email verified successfully. We will let u know once admin will approve you as a Photographer', photographer: user })
  })


  const resendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body
  
    const user = await Photographer.findOne({ email })
    if(!user) return res.status(400).send({message: 'User not found'})
  
    const otp = Math.floor(100000 + Math.random() * 900000);

    await sendVerificationEmail(otp, email)

    user.otp = otp.toString()
    await user.save()
    
    res.status(200).send({ message: 'OTP resent successfully', photographer: user})
})

module.exports = {
    registerPhotographer,
    photographerLogin,
    handlePhotographerStatusUpdate,
    resetPassword,
    getAllPhotographers,
    getPhotographerById,
    getAllPendingPhotographersForAdmin,
    updatePhotographer,
    updatePhotographerRank,
    toggleFeaturedPhotographer,
    getFeaturedPhotographer,
    verifyPhotographerProfile,
    resendOTP
}