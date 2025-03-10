const express = require('express');
const router = express.Router();

const { 
    createPlan,
    getAllPlans,
    getPlanById,
    updatePlan,
    deletePlan
     } = require('../controller/planController');
     
const { isAdmin } = require('../middleware/authMiddleware')


router.post('/add-plan', isAdmin, createPlan);
router.post('/update-plan', isAdmin, updatePlan);
router.delete('/delete-plan', isAdmin, deletePlan);
router.get('/get-all-plans', getAllPlans);
router.get('/get-plan-by-id', getPlanById);



module.exports = router;
