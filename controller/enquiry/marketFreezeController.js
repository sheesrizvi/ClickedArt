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

const getPendingMarketFreezeRequests = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query
    const marketFreezeRequest = await MarketFreeze.find({
        $or: [
            { status: 'pending' },
            { status: 'reviewed' }
        ]
    }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
    
    if(!marketFreezeRequest || marketFreezeRequest.length === 0) {
        return res.status(400).send({ message: 'Enquiries not found' })
    }

    const totalDocuments = await MarketFreeze.countDocuments({ $or: [
        { status: 'pending' },
        { status: 'reviewed' }
    ]})
    const pageCount = Math.ceil(totalDocuments/pageSize)


    res.status(200).json({marketFreezeRequest, pageCount});
});


const getResolvedMarketFreezeRequests = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query
    const marketFreezeRequest = await MarketFreeze.find({
      status: 'approved'
    }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
    
    if(!marketFreezeRequest || marketFreezeRequest.length === 0) {
        return res.status(400).send({ message: 'Enquiries not found' })
    }

    const totalDocuments = await MarketFreeze.countDocuments({  status: 'resolved' })
    const pageCount = Math.ceil(totalDocuments/pageSize)


    res.status(200).json({marketFreezeRequest, pageCount});
});

const getMarketFreezeRequestById = asyncHandler(async (req, res) => {
    const { requestId } = req.query;
    const marketFreezeRequest = await MarketFreeze.findById(requestId);
    if (!marketFreezeRequest) {
        return res.status(404).json({ message: 'Request not found' });
    }
    res.status(200).json({ marketFreezeRequest });
})

const deleteMarketFreezeRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.query;
    const deletedRequest = await MarketFreeze.findByIdAndDelete(requestId)
    
    if (!deletedRequest) {
       return res.status(404).json({ message: 'Request not found' })
    }
    res.status(200).json({ message: 'Request deleted successfully' })
})

const updateMarketFreezeRequestStatus = asyncHandler(async (req, res) => {
    const { requestId, status } = req.body;
    const marketFreezeRequest = await MarketFreeze.findById(requestId)

    if(!marketFreezeRequest) {
        return res.status(400).send({ message: 'No Enquiry Found' })
    }

    marketFreezeRequest.status = status
    await marketFreezeRequest.save()

    res.status(200).json({ message: 'Status updated', marketFreezeRequest });
});

module.exports = {
    createMarketFreezeRequest,
    getPendingMarketFreezeRequests,
    getResolvedMarketFreezeRequests,
    getMarketFreezeRequestById,
    deleteMarketFreezeRequest,
    updateMarketFreezeRequestStatus
};
