const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateClient, validateId, validatePagination } = require('../middleware/validation');
const clientsController = require('../controllers/clientsController');

const router = express.Router();

// Get all clients with pagination and search
router.get('/', authenticateToken, validatePagination, clientsController.getAllClients);

// Get single client by ID
router.get('/:id', authenticateToken, validateId, clientsController.getClientById);

// Create new client
router.post('/', authenticateToken, authorize('cashier', 'supervisor', 'administrator'), validateClient, clientsController.createClient);

// Update client
router.put('/:id', authenticateToken, authorize('cashier', 'supervisor', 'administrator'), validateId, validateClient, clientsController.updateClient);

// Delete client (soft delete)
router.delete('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, clientsController.deleteClient);

// Get client statistics
router.get('/:id/stats', authenticateToken, validateId, clientsController.getClientStats);

// Get client invoices
router.get('/:id/invoices', authenticateToken, validateId, validatePagination, clientsController.getClientInvoices);

// Get client transactions
router.get('/:id/transactions', authenticateToken, validateId, validatePagination, clientsController.getClientTransactions);

module.exports = router; 