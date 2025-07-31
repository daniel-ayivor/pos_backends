const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateTransaction, validateId, validatePagination } = require('../middleware/validation');
const transactionsController = require('../controllers/transactionsController');

const router = express.Router();

router.get('/', authenticateToken, validatePagination, transactionsController.getAllTransactions);
router.get('/:id', authenticateToken, validateId, transactionsController.getTransactionById);
router.post('/', authenticateToken, authorize('cashier', 'supervisor', 'administrator'), validateTransaction, transactionsController.createTransaction);
router.patch('/:id/status', authenticateToken, authorize('cashier', 'supervisor', 'administrator'), validateId, transactionsController.updateTransactionStatus);
router.post('/:id/refund', authenticateToken, authorize('supervisor', 'administrator'), validateId, transactionsController.refundTransaction);
router.get('/stats/overview', authenticateToken, transactionsController.getTransactionStats);
router.get('/recent/list', authenticateToken, transactionsController.getRecentTransactions);
router.get('/export/csv', authenticateToken, authorize('supervisor', 'administrator'), transactionsController.exportTransactions);

module.exports = router; 