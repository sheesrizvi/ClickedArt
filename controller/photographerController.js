const asyncHandler = require("express-async-handler")
const User = require("../models/userModel.js")
const Photographer = require('../models/photographerModel.js')
const { generateFromEmail } = require("unique-username-generator")
const UserType = require('../models/typeModel.js')
const { sendResetEmail } = require("../middleware/handleEmail.js");
const { differenceInYears, parseISO, isValid } = require('date-fns');

const registerPhotographer = asyncHandler(async (req, res) => {
    const { name, email, password, bio, dob, profileImage, address, isCompany, companyName, companyEmail, companyAddress, companyPhone, portfolioLink, photographyStyles, yearsOfExperience, accountType, connectedAccounts } = req.body

    if(!name || !email || !password || !address ) {
        return res.status(400).json({status: false, message: 'All Fields are required'})
    }

    const existingPhotographer = await Photographer.findOne({ email });
    if (existingPhotographer) {
        return res.status(400).json({status: false,  message: "Email already exist" });
    }

    const username = generateFromEmail(
        name,
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
        name, email, username, password,  address,
        companyName: !companyName ? name : companyName
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

    const photographer = new Photographer({
        name, email, username, password, address, bio, dob, age, profileImage, portfolioLink,
        yearsOfExperience,
        accountType,
        photographyStyles,
        companyName: !companyName ? name : companyName,
        isCompany: photographerData.isCompany,
        companyEmail: !companyEmail ?  email : companyEmail,
        companyAddress: photographerData.companyAddress || undefined, 
        companyPhone: photographerData.companyPhone,
        connectedAccounts
    });
    
    await photographer.save();
    await UserType.create({
        user: photographer._id,
        username: photographer.username,
        type: photographer.type
    })

    res.status(201).json({
        status: true,
        message: 'We will let u know once admin will approve you as a Photographer',
        _id: photographer._id,
        email: photographer.email
    }); 
})

const updatePhotographer = asyncHandler(async (req, res) => {
    const { 
        photographerId,
        name, 
        email, 
        password, 
        bio, 
        dob, 
        profileImage, 
        address, 
        isCompany, 
        companyName, 
        companyEmail, 
        companyAddress, 
        companyPhone, 
        portfolioLink, 
        photographyStyles, 
        yearsOfExperience, 
        accountType, 
        connectedAccounts 
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

    if (name && name !== photographer.name) {
        const username = generateFromEmail(name, 4);
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
    if(name) photographer.name = name
    if(email) photographer.email = email
    if (bio) photographer.bio = bio;
    if (profileImage) photographer.profileImage = profileImage;
    if (address) photographer.address = address;
    if (portfolioLink) photographer.portfolioLink = portfolioLink;
    if (photographyStyles) photographer.photographyStyles = photographyStyles;
    if (yearsOfExperience) photographer.yearsOfExperience = yearsOfExperience;
    if (accountType) photographer.accountType = accountType;
    if (connectedAccounts) photographer.connectedAccounts = connectedAccounts;
    if(password) photographer.password = password

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
        if (photographer && (await photographer.isPasswordCorrect(password))) {
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

module.exports = {
    registerPhotographer,
    photographerLogin,
    handlePhotographerStatusUpdate,
    resetPassword,
    getAllPhotographers,
    getPhotographerById,
    getAllPendingPhotographersForAdmin,
    updatePhotographer
}