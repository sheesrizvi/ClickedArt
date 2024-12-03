const asyncHandler = require('express-async-handler')
const GST = require('../models/gstModel.js')
const UserType = require('../models/typeModel.js')

const createGstDetails = asyncHandler(async (req, res) => {
    const {
      userId,
      gstNumber,
      registeredName,
      address,
      state,
      country,
      pinCode,
      gstType,
    } = req.body;
  
    const gstExist = await GST.findOne({ 'userInfo.user': userId })
    if(gstExist) {
        res.status(400)
        throw new Error('GST already exist')
    }

    const userType = await UserType.findOne({ user: userId }).select('type -_id')
    const type = userType?.type || null;

    if(!type) {
        res.status(400)
        throw new Error('User not found')
    }

    const gst = await GST.create({
      userInfo: {
        user: userId,
        userType: type
      },
      gstNumber,
      registeredName,
      address,
      state,
      country,
      pinCode,
      gstType,
    });
  
    res.status(201).json({ gst });
  })


  const updateGstDetails = asyncHandler(async (req, res) => {
    const {
      userId,
      gstNumber,
      registeredName,
      address,
      state,
      country,
      pinCode,
      gstType,
    } = req.body;
  
    const gst = await GST.findOne({ 'userInfo.user': userId });
    if (!gst) return res.status(400).send({ message: 'GST entry does not exist' });
  
    gst.gstNumber = gstNumber || gst.gstNumber;
    gst.registeredName = registeredName || gst.registeredName;
    gst.address = address || gst.address;
    gst.state = state || gst.state;
    gst.country = country || gst.country;
    gst.pinCode = pinCode || gst.pinCode;
    gst.gstType = gstType || gst.gstType;
    
    await gst.save();
  
    res.status(200).send({ gst });
  });

const deleteGstDetails = asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const gstExist = await GST.findOne({ 'userInfo.user': userId })
    if(!gstExist) {
        res.status(400)
        throw new Error('GST not exist for this user')
    }
    await GST.findOneAndDelete({ 'userInfo.user': userId });
    res.status(204).send();
  });
  
const getGSTDetailsByUser = asyncHandler(async (req, res) => {
    const { userId } = req.query

    const gstExist = await GST.findOne({ 'userInfo.user': userId })
    if(!gstExist) {
        res.status(400)
        throw new Error('GST not exist for this user')
    }

    res.status(200).send({ gst: gstExist })

})


const getAllGSTDetails = asyncHandler(async(req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const gst = await GST.find({}).populate('userInfo.user').skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!gst || gst.lenth === 0) {
        throw new Error('No GST Details found')
    }

   const totalDocuments = await GST.countDocuments({})
   const pageCount = Math.ceil(totalDocuments/pageSize)

   res.status(200).send({ gst, pageCount })
})

  module.exports = {
    createGstDetails,
    updateGstDetails,
    deleteGstDetails,
    getGSTDetailsByUser,
    getAllGSTDetails
  }