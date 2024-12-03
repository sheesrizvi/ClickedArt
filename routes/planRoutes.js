const express = require('express');
const router = express.Router();

const { addPlan,
    updatePlan,
    deletePlan,
    getAllPlans,
    getPlanById,
    getPlansByUserType
     } = require('../controller/planController');
const { isAdmin } = require('../middleware/authMiddleware')

router.post('/add-plan', isAdmin, addPlan);
router.post('/update-plan', isAdmin, updatePlan);
router.delete('/delete-plan', isAdmin, deletePlan);

router.get('/get-all-plans', getAllPlans);
router.get('/get-plan-by-id', getPlanById);
router.get('/get-plans-by-user-type', getPlansByUserType);



module.exports = router;
