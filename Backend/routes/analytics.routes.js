const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analytics.service');
const authMiddleware = require('../middlewares/auth.middleware');

// Get captain analytics
router.get('/captain/:captainId', 
    // authMiddleware.authCaptain, 
    async (req, res) => {
        try {
            const { captainId } = req.params;
            const analytics = await analyticsService.getCaptainAnalytics(captainId);
            res.json(analytics);
        } catch (error) {
            console.error('Error fetching captain analytics:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// Get captain ride history
router.get('/captain/:captainId/rides', 
    // authMiddleware.authCaptain,
    async (req, res) => {
        try {
            const { captainId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            
            const history = await analyticsService.getCaptainRideHistory(
                captainId, 
                parseInt(page), 
                parseInt(limit)
            );
            
            res.json(history);
        } catch (error) {
            console.error('Error fetching ride history:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// Get system analytics (admin only)
router.get('/system', 
    // authMiddleware.authAdmin, 
    async (req, res) => {
        try {
            const analytics = await analyticsService.getSystemAnalytics();
            res.json(analytics);
        } catch (error) {
            console.error('Error fetching system analytics:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;