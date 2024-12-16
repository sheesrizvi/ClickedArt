const asyncHandler = require('express-async-handler');
const License = require('../models/license');

const createLicense = asyncHandler(async (req, res) => {
    const { type, purpose, commonUses, restrictions, approxPrice, scopeOfUse, duration, geographicLimitations,canModify, attributionRequired   } = req.body

    const license = new License({
        type,
        purpose, 
        commonUses, 
        restrictions,
        approxPrice, 
        scopeOfUse,
        duration, 
        geographicLimitations,
        canModify,
        attributionRequired 
    });
    await license.save();
    res.status(201).json({ license });
});

const getAllLicenses = asyncHandler(async (req, res) => {
    const licenses = await License.find();
    res.status(200).json({ licenses });
});

const getLicenseById = asyncHandler(async (req, res) => {
    const license = await License.findById(req.query.id);
    if (!license) {
        return res.status(404).json({ error: 'License not found' });
    }
    res.status(200).json({ license });
});

const updateLicense = asyncHandler(async (req, res) => {
    const { licenseId, type, purpose, commonUses, restrictions, approxPrice, scopeOfUse, duration, geographicLimitations, canModify, attributionRequired  } = req.body
    const license = await License.findById(licenseId)
    if (!license) {
        return res.status(404).json({ error: 'License not found' });
    }
    license.type = type || license.type
    license.purpose = purpose || license.purpose
    license.commonUses = commonUses || license.commonUses
    license.restrictions = restrictions || license.restrictions
    license.approxPrice = approxPrice || license.approxPrice
    license.scopeOfUse = scopeOfUse || license.scopeOfUse
    license.duration = duration || license.duration
    license.geographicLimitations = geographicLimitations || license.geographicLimitations
    license.canModify = canModify || license.canModify
    license.attributionRequired = attributionRequired || license.attributionRequired

    await license.save()

    res.status(200).json({license})
});

const deleteLicense = asyncHandler(async (req, res) => {
    const { licenseId } = req.query
    const license = await License.findByIdAndDelete(licenseId);
    if (!license) {
        return res.status(404).json({ error: 'License not found' });
    }
    await License.findOneAndDelete({ _id: licenseId })
    res.status(200).json({ message: 'License deleted successfully' });
});


module.exports = {
    createLicense,
    updateLicense,
    getAllLicenses,
    getLicenseById,
    deleteLicense
}