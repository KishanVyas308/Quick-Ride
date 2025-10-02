const EarningsService = require('../services/earnings.service');
const { validationResult } = require('express-validator');

// Get earnings summary for different periods
module.exports.getEarningsSummary = async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const captainId = req.captain._id;

        if (!['today', 'week', 'month'].includes(period)) {
            return res.status(400).json({ 
                message: 'Invalid period. Use: today, week, or month' 
            });
        }

        const earningsSummary = await EarningsService.getEarningsSummary(captainId, period);
        
        res.status(200).json({
            success: true,
            data: earningsSummary
        });

    } catch (error) {
        console.error('Error getting earnings summary:', error);
        res.status(500).json({ 
            message: error.message || 'Failed to get earnings summary' 
        });
    }
};

// Get comprehensive earnings analytics
module.exports.getEarningsAnalytics = async (req, res) => {
    try {
        const captainId = req.captain._id;

        const analytics = await EarningsService.getEarningsAnalytics(captainId);
        
        res.status(200).json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Error getting earnings analytics:', error);
        res.status(500).json({ 
            message: error.message || 'Failed to get earnings analytics' 
        });
    }
};

// Get ride-wise earnings breakdown
module.exports.getRideEarnings = async (req, res) => {
    try {
        const { rideId } = req.params;
        const rideModel = require('../models/ride.model');

        // Find the ride
        const ride = await rideModel.findById(rideId).populate('user', 'fullname phone');
        
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Check if the ride belongs to the requesting captain
        if (ride.captain.toString() !== req.captain._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized access to ride earnings' });
        }

        if (ride.status !== 'completed') {
            return res.status(400).json({ 
                message: 'Earnings can only be calculated for completed rides' 
            });
        }

        // Calculate earnings for this specific ride
        const earningsData = await EarningsService.calculateRideEarnings(ride);
        
        res.status(200).json({
            success: true,
            data: {
                ride: {
                    id: ride._id,
                    pickup: ride.pickup,
                    destination: ride.destination,
                    completedAt: ride.completedAt,
                    duration: ride.duration,
                    distance: ride.distance,
                    user: ride.user
                },
                earnings: earningsData
            }
        });

    } catch (error) {
        console.error('Error getting ride earnings:', error);
        res.status(500).json({ 
            message: error.message || 'Failed to get ride earnings' 
        });
    }
};

// Get daily earnings stats
module.exports.getDailyStats = async (req, res) => {
    try {
        const captainId = req.captain._id;
        const captainModel = require('../models/captain.model');
        
        const captain = await captainModel.findById(captainId);
        
        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }

        // Check if daily stats are for today
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const dailyStatsDate = captain.dailyStats.date ? 
            captain.dailyStats.date.toISOString().split('T')[0] : null;

        let dailyStats = captain.dailyStats;

        // If stats are not for today, reset them
        if (dailyStatsDate !== todayString) {
            dailyStats = {
                date: today,
                rides: 0,
                earnings: 0,
                onlineHours: 0
            };
        }

        res.status(200).json({
            success: true,
            data: {
                dailyStats,
                totalStats: captain.stats,
                lastUpdated: captain.updatedAt
            }
        });

    } catch (error) {
        console.error('Error getting daily stats:', error);
        res.status(500).json({ 
            message: error.message || 'Failed to get daily stats' 
        });
    }
};

// Update online hours (called when captain goes online/offline)
module.exports.updateOnlineHours = async (req, res) => {
    try {
        const { hoursWorked } = req.body;
        const captainId = req.captain._id;
        const captainModel = require('../models/captain.model');

        if (!hoursWorked || typeof hoursWorked !== 'number' || hoursWorked < 0) {
            return res.status(400).json({ 
                message: 'Valid hours worked is required' 
            });
        }

        const captain = await captainModel.findById(captainId);
        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }

        // Update daily stats
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const dailyStatsDate = captain.dailyStats.date ? 
            captain.dailyStats.date.toISOString().split('T')[0] : null;

        // Reset daily stats if it's a new day
        if (dailyStatsDate !== todayString) {
            captain.dailyStats.date = today;
            captain.dailyStats.rides = 0;
            captain.dailyStats.earnings = 0;
            captain.dailyStats.onlineHours = 0;
        }

        // Update hours
        captain.dailyStats.onlineHours += hoursWorked;
        captain.availability.totalOnlineHours += hoursWorked;
        captain.availability.lastOnlineAt = new Date();

        await captain.save();

        res.status(200).json({
            success: true,
            message: 'Online hours updated successfully',
            data: {
                dailyOnlineHours: captain.dailyStats.onlineHours,
                totalOnlineHours: captain.availability.totalOnlineHours
            }
        });

    } catch (error) {
        console.error('Error updating online hours:', error);
        res.status(500).json({ 
            message: error.message || 'Failed to update online hours' 
        });
    }
};