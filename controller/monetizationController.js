const Monetization = require('../models/monetizationModel.js');
const Photographer = require('../models/photographerModel.js');
const asyncHandler = require('express-async-handler');


const createMonetization = asyncHandler(async (req, res) => {
    const { photographerId, panPhoto, panNumber, country, bankAccNumber, ifsc, branch, passbookOrCancelledCheque, businessAccount } = req.body;
   
    const photographer = await Photographer.findByIdAndUpdate(photographerId, {
        $set: { isMonetized: true }
    }, { new: true });

    if (!photographer) {
        return res.status(404).json({ message: 'Photographer not found' });
    }

    const monetization = new Monetization({
        photographer: photographerId,
        panPhoto,
        panNumber,
        country,
        bankAccNumber,
        ifsc,
        branch,
        passbookOrCancelledCheque,
        businessAccount,
    });

    await monetization.save();
    res.status(201).json({ message: 'Monetization request created successfully', monetization });
});


const getMonetizationByPhotographerId = asyncHandler(async (req, res) => {
    const { photographerId } = req.query
    const monetization = await Monetization.findOne({ photographer: photographerId });
    if (!monetization) {
        return res.status(404).json({ message: 'Monetization request not found' });
    }
    res.status(200).json(monetization);
});

const updateMonetizationStatus = asyncHandler(async (req, res) => {
    const { id, status } = req.body
    const monetization = await Monetization.findById(id);
    if (!monetization) {
        return res.status(404).json({ message: 'Monetization request not found' });
    }

    monetization.status = status;
    await monetization.save();
    res.status(200).json({ message: 'Monetization status updated successfully', monetization });
});

const deleteMonetizationRequest = asyncHandler(async (req, res) => {
    const { id } = req.query
    const monetization = await Monetization.findByIdAndDelete(id);
    if (!monetization) {
        return res.status(404).json({ message: 'Monetization request not found' });
    }
    res.status(200).json({ message: 'Monetization request deleted successfully' });
});


const updateMonetization = asyncHandler(async (req, res) => {
    const { id, panPhoto, panNumber, country, bankAccNumber, ifsc, branch, passbookOrCancelledCheque, businessAccount, status } = req.body;

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

    if (businessAccount) {
        if (businessAccount.gstCopy) monetization.businessAccount.gstCopy = businessAccount.gstCopy;
        if (businessAccount.firmPan) monetization.businessAccount.firmPan = businessAccount.firmPan;
        if (businessAccount.firmGstCertificate) monetization.businessAccount.firmGstCertificate = businessAccount.firmGstCertificate;
        if (businessAccount.gstNumber) monetization.businessAccount.gstNumber = businessAccount.gstNumber;
    }

    if (status) monetization.status = status;

    await monetization.save();
    res.status(200).json({ message: 'Monetization request updated successfully', monetization });
});

module.exports = {
    createMonetization,
    getMonetizationByPhotographerId,
    updateMonetizationStatus,
    deleteMonetizationRequest,
    updateMonetization
};
