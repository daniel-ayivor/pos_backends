const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateService, validateId, validatePagination } = require('../middleware/validation');
const servicesController = require('../controllers/servicesController');

const router = express.Router();

router.get('/', authenticateToken, validatePagination, servicesController.getAllServices);
router.get('/:id', authenticateToken, validateId, servicesController.getServiceById);
router.post('/', authenticateToken, authorize('supervisor', 'administrator'), validateService, servicesController.createService);
router.put('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, validateService, servicesController.updateService);
router.delete('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, servicesController.deleteService);
router.get('/categories/list', authenticateToken, servicesController.getCategories);
router.get('/stats/overview', authenticateToken, servicesController.getServiceStats);
router.get('/:id/usage', authenticateToken, validateId, servicesController.getServiceUsage);
router.put('/bulk/update-prices', authenticateToken, authorize('supervisor', 'administrator'), servicesController.bulkUpdatePrices);

module.exports = router; 