const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateUser, validateId, validatePagination } = require('../middleware/validation');
const usersController = require('../controllers/usersController');

const router = express.Router();

router.get('/', authenticateToken, authorize('administrator'), validatePagination, usersController.getAllUsers);
router.get('/:id', authenticateToken, authorize('administrator'), validateId, usersController.getUserById);
router.post('/', authenticateToken, authorize('administrator'), validateUser, usersController.createUser);
router.put('/:id', authenticateToken, authorize('administrator'), validateId, usersController.updateUser);
router.patch('/:id/password', authenticateToken, authorize('administrator'), validateId, usersController.updateUserPassword);
router.delete('/:id', authenticateToken, authorize('administrator'), validateId, usersController.deleteUser);
router.get('/stats/overview', authenticateToken, authorize('administrator'), usersController.getUserStats);
router.get('/roles/list', authenticateToken, usersController.getUserRoles);
router.get('/permissions/list', authenticateToken, usersController.getUserPermissions);

module.exports = router; 