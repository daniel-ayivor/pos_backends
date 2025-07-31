const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateInvoice, validateId, validatePagination } = require('../middleware/validation');
const invoicesController = require('../controllers/invoicesController');

const router = express.Router();

router.get('/', authenticateToken, validatePagination, invoicesController.getAllInvoices);
router.get('/:id', authenticateToken, validateId, invoicesController.getInvoiceById);
router.post('/', authenticateToken, authorize('cashier', 'supervisor', 'administrator'), validateInvoice, invoicesController.createInvoice);
router.put('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, validateInvoice, invoicesController.updateInvoice);
router.patch('/:id/status', authenticateToken, authorize('cashier', 'supervisor', 'administrator'), validateId, invoicesController.updateInvoiceStatus);
router.delete('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, invoicesController.deleteInvoice);
router.get('/stats/overview', authenticateToken, invoicesController.getInvoiceStats);
router.get('/export/csv', authenticateToken, authorize('supervisor', 'administrator'), invoicesController.exportInvoices);

module.exports = router; 