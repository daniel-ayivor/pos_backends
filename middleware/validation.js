const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['administrator', 'supervisor', 'cashier', 'staff']).withMessage('Invalid role'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Client validation
const validateClient = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('phone').optional().isMobilePhone().withMessage('Must be a valid phone number'),
  body('company').optional().trim().isLength({ max: 100 }).withMessage('Company name too long'),
  handleValidationErrors
];

// Service validation
const validateService = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Service name must be between 2 and 100 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  handleValidationErrors
];

// Project validation
const validateProject = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Project name must be between 2 and 100 characters'),
  body('clientId').isUUID().withMessage('Invalid client ID'),
  body('serviceId').isUUID().withMessage('Invalid service ID'),
  body('status').isIn(['brief-received', 'in-progress', 'review', 'revision', 'completed', 'delivered']).withMessage('Invalid status'),
  body('priority').isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('dueDate').isISO8601().withMessage('Invalid due date'),
  body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  handleValidationErrors
];

// Invoice validation
const validateInvoice = [
  body('clientId').isUUID().withMessage('Invalid client ID'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('status').isIn(['draft', 'pending', 'paid', 'overdue']).withMessage('Invalid status'),
  body('dueDate').isISO8601().withMessage('Invalid due date'),
  body('items').isArray({ min: 1 }).withMessage('Invoice must have at least one item'),
  body('items.*.serviceId').isUUID().withMessage('Invalid service ID in items'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  handleValidationErrors
];

// Transaction validation
const validateTransaction = [
  body('clientId').isUUID().withMessage('Invalid client ID'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('paymentMethod').isIn(['cash', 'card', 'mobile_money', 'bank_transfer']).withMessage('Invalid payment method'),
  body('items').isArray({ min: 1 }).withMessage('Transaction must have at least one item'),
  body('items.*.serviceId').isUUID().withMessage('Invalid service ID in items'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  handleValidationErrors
];

// Time tracking validation
const validateTimeEntry = [
  body('employeeId').isUUID().withMessage('Invalid employee ID'),
  body('clockIn').isISO8601().withMessage('Invalid clock in time'),
  body('clockOut').optional().isISO8601().withMessage('Invalid clock out time'),
  body('status').isIn(['clocked-in', 'clocked-out', 'break']).withMessage('Invalid status'),
  handleValidationErrors
];

// Employee validation
const validateEmployee = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('phone').optional().isMobilePhone().withMessage('Must be a valid phone number'),
  body('role').isIn(['designer', 'developer', 'marketer', 'manager', 'assistant']).withMessage('Invalid role'),
  body('department').optional().trim().isLength({ max: 50 }).withMessage('Department name too long'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id').isUUID().withMessage('Invalid ID format'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  handleValidationErrors
];

// Date range validation
const validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateLogin,
  validateClient,
  validateService,
  validateProject,
  validateInvoice,
  validateTransaction,
  validateTimeEntry,
  validateEmployee,
  validateId,
  validatePagination,
  validateDateRange
}; 