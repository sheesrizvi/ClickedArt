const Monetization = require('../models/monetizationModel.js');
const Photographer = require('../models/photographerModel.js');
const asyncHandler = require('express-async-handler');
const { sendMonetizationMail, sendMonetizationDisApprovalMail } = require('../middleware/handleEmail.js')

const createMonetization = asyncHandler(async (req, res) => {
    const { photographerId, photographerPhoto, panPhoto, panNumber, governmentIdProof, address, country,  bankName, bankAccountName, bankAccNumber, ifsc, branch, passbookOrCancelledCheque, isBusinessAccount, businessAccount } = req.body;
   
    const monetization = new Monetization({
        photographer: photographerId,
        photographerPhoto,
        panPhoto,
        panNumber,
        country,
        governmentIdProof,
        bankName,
        bankAccountName,
        bankAccNumber,
        address,
        ifsc,
        branch,
        passbookOrCancelledCheque,
        isBusinessAccount,
        businessAccount,
    });

    await monetization.save();

    res.status(201).json({ message: 'Monetization request created successfully', monetization });
});


const getMonetizationByPhotographerId = asyncHandler(async (req, res) => {
    const { photographerId } = req.query
    const monetization = await Monetization.findOne({ photographer: photographerId }).populate('photographer');

    if (!monetization) {
        return res.status(404).json({ message: 'Monetization request not found' });
    }

    const { panNumber, bankAccNumber } = monetization
    
    const results = await Monetization.find({ $or: [
        {
            panNumber
        },
        {
            bankAccNumber
        }
    ], photographer: { $ne: photographerId } }).populate('photographer')

    const photographers = results.map((item) => item.photographer)
    
    if(!photographers || photographers.length === 0) {
        return res.status(200).json({ monetization, photographers: [] });
    }
    
    res.status(200).json({ monetization, photographers });
});

const updateMonetizationStatus = asyncHandler(async (req, res) => {
    const { id, status, reasons } = req.body
    const monetization = await Monetization.findById(id).populate('photographer');
    if (!monetization) {
        return res.status(404).json({ message: 'Monetization request not found' });
    }

    monetization.status = status;
    const photographerName = `${monetization.photographer.firstName} ${monetization.photographer.lastName}`
    const email = monetization.photographer.email
    
    if(status === 'rejected') {
        await Photographer.findByIdAndUpdate(monetization.photographer._id, {
            $set: { isMonetized: false }
        }, { new: true });
        sendMonetizationDisApprovalMail(photographerName, email, reasons)
    } else if(status === 'approved') {
        await Photographer.findByIdAndUpdate(monetization.photographer._id, {
            $set: { isMonetized: true }
        }, { new: true });
        sendMonetizationMail(photographerName, email)
    }

    await monetization.save();
    res.status(200).json({ message: 'Monetization status updated successfully', monetization });
});

const deleteMonetizationRequest = asyncHandler(async (req, res) => {
    const { id } = req.query
    const monetization = await Monetization.findOne({ _id: id });
    if (!monetization) {
        return res.status(404).json({ message: 'Monetization request not found' });
    }
    const photographerId = monetization?.photographer
    await Photographer.findByIdAndUpdate(photographerId, {
        $set: { isMonetized: false }
    }, { new: true });

    await Monetization.findOneAndDelete({ _id: id })
    res.status(200).json({ message: 'Monetization request deleted successfully' });
});


const updateMonetization = asyncHandler(async (req, res) => {
    const { id, photographerPhoto, panPhoto, panNumber, country , bankName, bankAccountName, bankAccNumber, ifsc, branch, passbookOrCancelledCheque, businessAccount, status, address, governmentIdProof } = req.body;

    const monetization = await Monetization.findById(id);
    if (!monetization) {
        return res.status(404).json({ message: 'Monetization request not found' });
    }

    if (panPhoto) monetization.panPhoto = panPhoto;
    if (panNumber) monetization.panNumber = panNumber;
    if (country) monetization.country = country;
    if (bankAccNumber) monetization.bankAccNumber = bankAccNumber;
    if (ifsc) monetization.ifsc = ifsc;
    if (branch) monetization.branch = branch;
    if (passbookOrCancelledCheque) monetization.passbookOrCancelledCheque = passbookOrCancelledCheque;
    if(bankAccountName) monetization.bankAccountName = bankAccountName
    if(address) monetization.address = address
    if(bankName) monetization.bankName = bankName
    if(governmentIdProof) monetization.governmentIdProof = governmentIdProof
    if(photographerPhoto) monetization.photographerPhoto = photographerPhoto

    if (businessAccount) {
        if (businessAccount.gstCopy) monetization.businessAccount.gstCopy = businessAccount.gstCopy;
        if (businessAccount.firmPan) monetization.businessAccount.firmPan = businessAccount.firmPan;
        if (businessAccount.firmGstCertificate) monetization.businessAccount.firmGstCertificate = businessAccount.firmGstCertificate;
        if (businessAccount.gstNumber) monetization.businessAccount.gstNumber = businessAccount.gstNumber;
    }

    monetization.status = 'pending';

    await monetization.save();

    
    await Photographer.findByIdAndUpdate(monetization.photographer, {
        $set: { isMonetized: false }
    }, { new: true });


    res.status(200).json({ message: 'Monetization request updated successfully', monetization });
});

const getAllMonetizations = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const [ monetizations, totalDocuments ] = await Promise.all([
        Monetization.find({}).populate('photographer').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
        Monetization.countDocuments({})
    ])

    if(!monetizations || monetizations.length === 0) {
        return res.status(400).send({ message: 'Monetization not found' })
    }

    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ monetizations, pageCount })
})

const getPendingMonetizations = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const [ monetizations, totalDocuments ] = await Promise.all([
        Monetization.find({ status: 'pending' }).populate('photographer').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
        Monetization.countDocuments({  status: 'pending'  })
    ])

    if(!monetizations || monetizations.length === 0) {
        return res.status(400).send({ message: 'Monetization not found' })
    }

    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ monetizations, pageCount })
})

module.exports = {
    createMonetization,
    getMonetizationByPhotographerId,
    updateMonetizationStatus,
    deleteMonetizationRequest,
    updateMonetization,
    getAllMonetizations,
    getPendingMonetizations
};
