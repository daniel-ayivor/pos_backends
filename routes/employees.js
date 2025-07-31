const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateEmployee, validateId, validatePagination } = require('../middleware/validation');
const employeesController = require('../controllers/employeesController');

const router = express.Router();

router.get('/', authenticateToken, validatePagination, employeesController.getAllEmployees);
router.get('/:id', authenticateToken, validateId, employeesController.getEmployeeById);
router.post('/', authenticateToken, authorize('supervisor', 'administrator'), validateEmployee, employeesController.createEmployee);
router.put('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, validateEmployee, employeesController.updateEmployee);
router.delete('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, employeesController.deleteEmployee);
router.get('/:id/stats', authenticateToken, validateId, employeesController.getEmployeeStats);
router.get('/departments/list', authenticateToken, employeesController.getDepartments);
router.get('/roles/list', authenticateToken, employeesController.getRoles);
router.get('/stats/overview', authenticateToken, employeesController.getEmployeeOverviewStats);

module.exports = router; 