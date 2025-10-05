const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const adminMiddleware = require('../middlewares/admin.middleware');

// Admin Authentication Routes
router.post('/register', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').optional().isIn(['super_admin', 'admin', 'moderator']).withMessage('Invalid role'),
    body('department').optional().isIn(['operations', 'customer_support', 'finance', 'technical', 'management']).withMessage('Invalid department')
], adminController.registerAdmin);

router.post('/login', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], adminController.loginAdmin);

router.get('/profile', adminMiddleware.authAdmin, adminController.getAdminProfile);

router.get('/logout', adminMiddleware.authAdmin, adminController.logoutAdmin);

// Dashboard Routes
router.get('/dashboard', 
    adminMiddleware.authAdmin,
    adminController.getDashboard
);

// User Management Routes
router.get('/users', 
    adminMiddleware.authAdmin,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    adminController.getUsers
);

router.get('/users/:userId',
    adminMiddleware.authAdmin,
    param('userId').isMongoId().withMessage('Invalid user ID'),
    adminController.getUserDetails
);

router.patch('/users/:userId/status',
    adminMiddleware.authAdmin,
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('status').isIn(['active', 'inactive', 'banned']).withMessage('Invalid status'),
    adminController.updateUserStatus
);

// Captain Management Routes
router.get('/captains',
    adminMiddleware.authAdmin,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    adminController.getCaptains
);

router.get('/captains/:captainId',
    adminMiddleware.authAdmin,
    param('captainId').isMongoId().withMessage('Invalid captain ID'),
    adminController.getCaptainDetails
);

router.patch('/captains/:captainId/status',
    adminMiddleware.authAdmin,
    param('captainId').isMongoId().withMessage('Invalid captain ID'),
    body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
    adminController.updateCaptainStatus
);

router.patch('/captains/:captainId/verify',
    adminMiddleware.authAdmin,
    param('captainId').isMongoId().withMessage('Invalid captain ID'),
    body('isVerified').isBoolean().withMessage('Verification status must be boolean'),
    adminController.verifyCaptain
);

// Ride Management Routes
router.get('/rides',
    adminMiddleware.authAdmin,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    adminController.getRides
);

router.get('/rides/:rideId',
    adminMiddleware.authAdmin,
    param('rideId').isMongoId().withMessage('Invalid ride ID'),
    adminController.getRideDetails
);

router.patch('/rides/:rideId/cancel',
    adminMiddleware.authAdmin,
    param('rideId').isMongoId().withMessage('Invalid ride ID'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    adminController.cancelRide
);

// Financial Reports Routes
router.get('/reports/financial',
    adminMiddleware.authAdmin,
    query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid period'),
    adminController.getFinancialReport
);

module.exports = router;