const express = require('express');
const router = express.Router();

const {
    createPrivacyPolicy,
    getAllPrivacyPolicies,
    getActivePrivacyPolicy,
    getPrivacyPolicyById,
    updatePrivacyPolicy,
    deletePrivacyPolicy
} = require('../controller/privacyPolicyController');

const { isAdmin } = require('../middleware/authMiddleware');

// Admin routes
router.post('/add-privacy-policy', isAdmin, createPrivacyPolicy);
router.post('/update-privacy-policy', isAdmin, updatePrivacyPolicy);
router.delete('/delete-privacy-policy', isAdmin, deletePrivacyPolicy);

// Public routes
router.get('/get-all-privacy-policies', getAllPrivacyPolicies);
router.get('/get-privacy-policy-by-id', getPrivacyPolicyById);
router.get('/get-active-privacy-policy', getActivePrivacyPolicy);

module.exports = router;
