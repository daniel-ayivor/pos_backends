const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateProject, validateId, validatePagination } = require('../middleware/validation');
const projectsController = require('../controllers/projectsController');

const router = express.Router();

router.get('/', authenticateToken, validatePagination, projectsController.getAllProjects);
router.get('/:id', authenticateToken, validateId, projectsController.getProjectById);
router.post('/', authenticateToken, authorize('supervisor', 'administrator'), validateProject, projectsController.createProject);
router.put('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, validateProject, projectsController.updateProject);
router.patch('/:id/progress', authenticateToken, authorize('supervisor', 'administrator'), validateId, projectsController.updateProjectProgress);
router.delete('/:id', authenticateToken, authorize('supervisor', 'administrator'), validateId, projectsController.deleteProject);
router.get('/stats/overview', authenticateToken, projectsController.getProjectStats);
router.get('/client/:clientId', authenticateToken, validateId, projectsController.getProjectsByClient);
router.get('/overdue/list', authenticateToken, projectsController.getOverdueProjects);
router.get('/due-soon/list', authenticateToken, projectsController.getDueSoonProjects);

module.exports = router; 