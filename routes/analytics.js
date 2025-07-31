const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.get('/dashboard', authenticateToken, analyticsController.getDashboardStats);
router.get('/revenue', authenticateToken, analyticsController.getRevenueAnalytics);
router.get('/top-performers', authenticateToken, analyticsController.getTopPerformers);
router.get('/employee-performance', authenticateToken, authorize('supervisor', 'administrator'), analyticsController.getEmployeePerformance);
router.get('/projects', authenticateToken, analyticsController.getProjectAnalytics);

module.exports = router; 