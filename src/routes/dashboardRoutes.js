const express = require('express');
const router = express.Router();
const { showFarmerDashboard, showClientDashboard } = require('../controllers/dashboardController');
const { requireAuth, requireFarmer, requireClient } = require('../middleware/auth');

// Dashboard routes - require authentication and appropriate user type
router.get('/farmer-dashboard', requireAuth, requireFarmer, showFarmerDashboard);
router.get('/client-dashboard', requireAuth, requireClient, showClientDashboard);

module.exports = router;