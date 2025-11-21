/**
 * Dashboard routes
 * Endpoints for dashboard statistics and analytics
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middlewares/auth');

// All dashboard routes require authentication
router.use(auth);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// GET /api/dashboard/wards - Get ward occupancy data
router.get('/wards', dashboardController.getWardOccupancy);

module.exports = router;
