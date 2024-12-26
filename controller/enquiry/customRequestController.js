const asyncHandler = require('express-async-handler');
const CustomRequest = require('../models/CustomRequest');

const createCustomRequest = asyncHandler(async (req, res) => {
    const { name, email, phone, requestType, requestDescription } = req.body;
    
    const customRequest = await CustomRequest.create({
        name,
        email,
        phone,
        requestType,
        requestDescription,
    });
    res.status(201).json({customRequest});
});

const getPendingCustomRequests = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query;
    
    const { customRequests, totalDocuments } = await Promise.all([
        CustomRequest.find({ $or: [ { status: 'review' }, { status: 'pending' } ]}).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize),
        CustomRequest.countDocuments({ $or: [ { status: 'review' }, { status: 'pending' } ]})
    ])

    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).json({ customRequests, pageCount });
});

const getResolvedCustomRequests = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query;
    
    const { customRequests, totalDocuments } = await Promise.all([
        CustomRequest.find({ status: 'approved' }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize),
        CustomRequest.countDocuments({ status: 'approved'})
    ])

    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).json({ customRequests, pageCount });
});


const getCustomRequestById = asyncHandler(async (req, res) => {
    const { id } = req.query;
    const customRequest = await CustomRequest.findById(id);
    res.status(200).json({customRequest});
});

const updateCustomRequest = asyncHandler(async (req, res) => {
    const { requestId, name, email, phone, requestType, requestDescription } = req.body;
    const customRequest = await CustomRequest.findById(requestId)

    if(!customRequest) {
        return res.status(400).send({ message: 'Request Not found' })
    }

    customRequest.name = name || customRequest.name
    customRequest.email = email || customRequest.email
    customRequest.phone = phone || customRequest.phone
    customRequest.requestType = requestType || customRequest.requestType
    customRequest.description = description || customRequest.description

    await customRequest.save()


    res.status(200).json({customRequest});
});

const deleteCustomRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.query;
    const result = await CustomRequest.findByIdAndDelete(requestId);

    if(!result) {
        return res.status(400).send({ message: 'No Request Found' })
    }

    res.status(200).send({ message: 'Request Deleted Successfully' })
});

const changeCustomRequestFormStatus = asyncHandler(async (req, res) => {
    const { status, requestId } = req.query

    const validStatusTypes = ['pending', 'review', 'approved', 'rejected']

    if(!validStatusTypes.includes(status)) {
        return res.status(400).send({ message: 'Not a Valid Status' })
    }

    const customRequest = await CustomRequest.findOne({ _id: requestId })

    customRequest.status = status 

    await customRequest.save()

    res.status(200).send({ message: 'Order Report Status changed successfully' })
})

module.exports = {
    createCustomRequest,
    getPendingCustomRequests,
    getResolvedCustomRequests,
    getCustomRequestById,
    updateCustomRequest,
    deleteCustomRequest,
    changeCustomRequestFormStatus
};
