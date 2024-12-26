const asyncHandler = require('express-async-handler');
const BulkEnquiry = require('../../models/enquiry/bulkDownloadEnquiryModel.js')

const createEnquiry = asyncHandler(async (req, res) => {
    const { userInfo, orderDetails, enquiryDetails } = req.body;
    if (!userInfo || !orderDetails || !enquiryDetails) {
        res.status(400).json({ message: 'Missing required fields: user, orderDetails, enquiryDetails' });
        return;
    }
    const bulkEnquiry = new BulkEnquiry({ userInfo, orderDetails, enquiryDetails });
    const savedEnquiry = await bulkEnquiry.save();
    res.status(201).json({ message: 'Enquiry Registered Successfully', savedEnquiry });
});

const updateEnquiry = asyncHandler(async (req, res) => {
    const { user, enquiryId, orderDetails, enquiryDetails } = req.body

    const enquiry = await BulkEnquiry.findOne({ _id: enquiryId, 'userInfo.user': user })
    if(!enquiry) {
        return res.status(400).send({ message: 'No Enquiry found' })
    }

    enquiry.orderDetails = orderDetails || enquiry.orderDetails
    enquiry.enquiryDetails = enquiryDetails || enquiry.enquiryDetails

    await enquiry.save()

    res.status(200).send({ message: "Updated" })

})

const getPendingEnquiries = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query
    const enquiries = await BulkEnquiry.find({}).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
    
    if(!enquiries || enquiries.length === 0) {
        return res.status(400).send({ message: 'Enquiries not found' })
    }

    const totalDocuments = await BulkEnquiry.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)


    res.status(200).json({enquiries, pageCount});
});

const getApprovedEnquiries = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query
    const enquiries = await BulkEnquiry.find({ status: 'approved' }).populate('userInfo.user').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
    
    if(!enquiries || enquiries.length === 0) {
        return res.status(400).send({ message: 'Enquiries not found' })
    }

    const totalDocuments = await BulkEnquiry.countDocuments({ status: 'approved' })
    const pageCount = Math.ceil(totalDocuments/pageSize)


    res.status(200).json({enquiries, pageCount});
});


const getEnquiryById = asyncHandler(async (req, res) => {
    const { enquiryId } = req.query;
    const enquiry = await BulkEnquiry.findById(enquiryId).populate('userInfo.user');
    if (!enquiry) {
        return res.status(404).json({ message: 'Enquiry not found' });
    }
    res.status(200).json({ enquiry });
});

const updateEnquiryStatus = asyncHandler(async (req, res) => {
    const { enquiryId, status } = req.body;
    const enquiry = await BulkEnquiry.findById(enquiryId)
    if(!enquiry) {
        return res.status(400).send({ message: 'No Enquiry Found' })
    }
    enquiry.status = status
    await enquiry.save()

    res.status(200).json({ message: 'Status updated',  enquiry });
});

const deleteEnquiry = asyncHandler(async (req, res) => {
    const { enquiryId } = req.query;
    const deletedEnquiry = await BulkEnquiry.findByIdAndDelete(enquiryId);
    if (!deletedEnquiry) {
        return res.status(404).json({ message: 'Enquiry not found' });
    }
    res.status(200).json({ message: 'Enquiry deleted successfully' });
})

const getMyEnquiry = asyncHandler(async (req, res) => {
    const { user } = req.query

    const enquiries = await BulkEnquiry.find({ 'userInfo.user': user })

    if(!enquiries || enquiries.length === 0) {
        return res.status(400).send({ message: 'No Enquiry Found' })
    }

    res.status(200).send({ message: 'Enquiries Found', enquiries })
})

module.exports = {
    createEnquiry,
    getPendingEnquiries,
    getApprovedEnquiries,
    getEnquiryById,
    updateEnquiryStatus,
    deleteEnquiry,
    getMyEnquiry,
    updateEnquiry
};
