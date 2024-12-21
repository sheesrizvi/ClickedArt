const asyncHandler = require('express-async-handler');
const MarketFreeze = require('../../models/enquiry/marketFreezeModel.js')

const createMarketFreezeRequest = asyncHandler(async (req, res) => {
    const { user, requestDetails } = req.body;
    if (!user || !requestDetails) {
        return res.status(400).json({ message: 'Missing required fields: user, requestDetails' });
    }
    const newRequest = new MarketFreeze({ user, requestDetails });
    const marketFreezeRequest = await newRequest.save();
    res.status(201).json({ message: 'Market Freeze Request created successfully',  marketFreezeRequest });
});

const getMarketFreezeRequests = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query
    const marketFreezeRequest = await MarketFreeze.find({}).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
    
    if(!marketFreezeRequest || marketFreezeRequest.length === 0) {
        return res.status(400).send({ message: 'Enquiries not found' })
    }

    const totalDocuments = await MarketFreeze.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)


    res.status(200).json({marketFreezeRequest, pageCount});
});

const getMarketFreezeRequestById = asyncHandler(async (req, res) => {
    const { id } = req.query;
    const marketFreezeRequest = await MarketFreeze.findById(id);
    if (!marketFreezeRequest) {
        return res.status(404).json({ message: 'Request not found' });
    }
    res.status(200).json({ marketFreezeRequest });
})

const deleteMarketFreezeRequest = asyncHandler(async (req, res) => {
    const { id } = req.query;
    const deletedRequest = await MarketFreeze.findByIdAndDelete(id);
    if (!deletedRequest) {
        res.status(404).json({ message: 'Request not found' });
        return;
    }
    res.status(200).json({ message: 'Request deleted successfully' });
})

const updateMarketFreezeRequestStatus = asyncHandler(async (req, res) => {
    const { id, status } = req.query;
    const marketFreezeRequest = await MarketFreeze.findById(id)
    if(!marketFreezeRequest) {
        return res.status(400).send({ message: 'No Enquiry Found' })
    }
    marketFreezeRequest.status = status
    await marketFreezeRequest.save()

    res.status(200).json({ marketFreezeRequest });
});

module.exports = {
    createMarketFreezeRequest,
    getMarketFreezeRequests,
    getMarketFreezeRequestById,
    deleteMarketFreezeRequest,
    updateMarketFreezeRequestStatus
};
