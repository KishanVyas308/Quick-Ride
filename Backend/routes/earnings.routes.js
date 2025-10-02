const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const earningsController = require('../controllers/earnings.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Get earnings summary (today, week, month)
router.get('/summary',
    authMiddleware.authCaptain,
    query('period').optional().isIn(['today', 'week', 'month']).withMessage('Invalid period'),
    earningsController.getEarningsSummary
);

// Get comprehensive analytics
router.get('/analytics',
    authMiddleware.authCaptain,
    earningsController.getEarningsAnalytics
);

// Get specific ride earnings
router.get('/ride/:rideId',
    authMiddleware.authCaptain,
    param('rideId').isMongoId().withMessage('Invalid ride ID'),
    earningsController.getRideEarnings
);

// Get daily stats
router.get('/daily-stats',
    authMiddleware.authCaptain,
    earningsController.getDailyStats
);

// Update online hours
router.post('/update-hours',
    authMiddleware.authCaptain,
    body('hoursWorked').isNumeric().withMessage('Hours worked must be a number'),
    earningsController.updateOnlineHours
);

module.exports = router;