const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateTimeEntry, validateId, validatePagination } = require('../middleware/validation');
const timeTrackingController = require('../controllers/timeTrackingController');

const router = express.Router();

router.get('/', authenticateToken, validatePagination, timeTrackingController.getAllTimeEntries);
router.get('/:id', authenticateToken, validateId, timeTrackingController.getTimeEntryById);
router.post('/clock-in', authenticateToken, timeTrackingController.clockIn);
router.post('/clock-out', authenticateToken, timeTrackingController.clockOut);
router.post('/', authenticateToken, authorize('supervisor', 'administrator'), validateTimeEntry, timeTrackingController.createTimeEntry);
router.put('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, validateTimeEntry, timeTrackingController.updateTimeEntry);
router.delete('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, timeTrackingController.deleteTimeEntry);
router.get('/status/current', authenticateToken, timeTrackingController.getCurrentStatus);
router.get('/stats/overview', authenticateToken, timeTrackingController.getTimeTrackingStats);
router.get('/export/csv', authenticateToken, authorize('supervisor', 'administrator'), timeTrackingController.exportTimeEntries);

module.exports = router; 