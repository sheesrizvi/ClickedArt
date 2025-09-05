const express = require('express');
const router = express.Router();

const {
    createTerms,
    getAllTerms,
    getActiveTerms,
    getTermsById,
    updateTerms,
    deleteTerms
} = require('../controller/termsController');

const { isAdmin } = require('../middleware/authMiddleware');

// Admin routes
router.post('/add-terms', isAdmin, createTerms);
router.post('/update-terms', isAdmin, updateTerms);
router.delete('/delete-terms', isAdmin, deleteTerms);

// Public routes
router.get('/get-all-terms', getAllTerms);
router.get('/get-terms-by-id', getTermsById);
router.get('/get-active-terms', getActiveTerms); 

module.exports = router;
