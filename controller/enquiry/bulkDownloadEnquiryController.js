const asyncHandler = require('express-async-handler');
const BulkEnquiry = require('../../models/enquiry/bulkDownloadEnquiryModel.js')

const createEnquiry = asyncHandler(async (req, res) => {
    const { user, orderDetails, enquiryDetails } = req.body;
    if (!user || !orderDetails || !enquiryDetails) {
        res.status(400).json({ message: 'Missing required fields: user, orderDetails, enquiryDetails' });
        return;
    }
    const bulkEnquiry = new BulkEnquiry({ user, orderDetails, enquiryDetails });
    const savedEnquiry = await bulkEnquiry.save();
    res.status(201).json({ message: 'Enquiry Registered Successfully', savedEnquiry });
});

const getEnquiries = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query
    const enquiries = await BulkEnquiry.find({}).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
    
    if(!enquiries || enquiries.length === 0) {
        return res.status(400).send({ message: 'Enquiries not found' })
    }

    const totalDocuments = await BulkEnquiry.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)


    res.status(200).json({enquiries, pageCount});
});

const getEnquiryById = asyncHandler(async (req, res) => {
    const { id } = req.query;
    const enquiry = await BulkEnquiry.findById(id);
    if (!enquiry) {
        return res.status(404).json({ message: 'Enquiry not found' });
    }
    res.status(200).json({ enquiry });
});

const updateEnquiryStatus = asyncHandler(async (req, res) => {
    const { id, status } = req.query;
    const enquiry = await BulkEnquiry.findById(id)
    if(!enquiry) {
        return res.status(400).send({ message: 'No Enquiry Found' })
    }
    enquiry.status = status
    await enquiry.save()

    res.status(200).json({ enquiry });
});

const deleteEnquiry = asyncHandler(async (req, res) => {
    const { id } = req.query;
    const deletedEnquiry = await BulkEnquiry.findByIdAndDelete(id);
    if (!deletedEnquiry) {
        return res.status(404).json({ message: 'Enquiry not found' });
    }
    res.status(200).json({ message: 'Enquiry deleted successfully' });
})

module.exports = {
    createEnquiry,
    getEnquiries,
    getEnquiryById,
    updateEnquiryStatus,
    deleteEnquiry,
};
