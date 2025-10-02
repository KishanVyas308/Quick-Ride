const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');
const userModel = require('../models/user.model');

// Get captain analytics
async function getCaptainAnalytics(captainId) {
    try {
        const captain = await captainModel.findById(captainId);
        if (!captain) {
            throw new Error('Captain not found');
        }

        // Get rides statistics
        const totalRides = await rideModel.countDocuments({ 
            captain: captainId, 
            status: 'completed' 
        });

        const totalEarnings = await rideModel.aggregate([
            { $match: { captain: captainId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$fare' } } }
        ]);

        // Get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayRides = await rideModel.countDocuments({
            captain: captainId,
            status: 'completed',
            completedAt: { $gte: today, $lt: tomorrow }
        });

        const todayEarnings = await rideModel.aggregate([
            { 
                $match: { 
                    captain: captainId, 
                    status: 'completed',
                    completedAt: { $gte: today, $lt: tomorrow }
                } 
            },
            { $group: { _id: null, total: { $sum: '$fare' } } }
        ]);

        // Get this week's stats
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        const weekEarnings = await rideModel.aggregate([
            { 
                $match: { 
                    captain: captainId, 
                    status: 'completed',
                    completedAt: { $gte: startOfWeek }
                } 
            },
            { $group: { _id: null, total: { $sum: '$fare' } } }
        ]);

        // Get average rating
        const ratings = await rideModel.aggregate([
            { $match: { captain: captainId, captainRating: { $exists: true } } },
            { $group: { _id: null, avgRating: { $avg: '$captainRating' }, count: { $sum: 1 } } }
        ]);

        return {
            totalRides,
            totalEarnings: totalEarnings[0]?.total || 0,
            todayRides,
            todayEarnings: todayEarnings[0]?.total || 0,
            weekEarnings: weekEarnings[0]?.total || 0,
            averageRating: ratings[0]?.avgRating || 5.0,
            totalRatings: ratings[0]?.count || 0,
            captain: {
                name: `${captain.fullname.firstname} ${captain.fullname.lastname}`,
                vehicle: captain.vehicle,
                city: captain.city,
                status: captain.status,
                availability: captain.availability
            }
        };
    } catch (error) {
        throw new Error(`Failed to get analytics: ${error.message}`);
    }
}

// Get ride analytics for admin
async function getSystemAnalytics() {
    try {
        const totalRides = await rideModel.countDocuments();
        const completedRides = await rideModel.countDocuments({ status: 'completed' });
        const activeDrivers = await captainModel.countDocuments({ 'availability.isOnline': true });
        const totalDrivers = await captainModel.countDocuments();
        const totalUsers = await userModel.countDocuments();

        // Revenue analytics
        const totalRevenue = await rideModel.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$fare' } } }
        ]);

        // Popular cities
        const popularCities = await rideModel.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Popular vehicle types
        const popularVehicles = await rideModel.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        return {
            totalRides,
            completedRides,
            activeDrivers,
            totalDrivers,
            totalUsers,
            totalRevenue: totalRevenue[0]?.total || 0,
            completionRate: totalRides > 0 ? ((completedRides / totalRides) * 100).toFixed(2) : 100,
            popularCities,
            popularVehicles
        };
    } catch (error) {
        throw new Error(`Failed to get system analytics: ${error.message}`);
    }
}

// Update captain statistics
async function updateCaptainStats(captainId, rideData) {
    try {
        const captain = await captainModel.findById(captainId);
        if (!captain) {
            throw new Error('Captain not found');
        }

        // Update total stats
        captain.stats.totalRides += 1;
        captain.stats.totalEarnings += rideData.fare;

        // Update daily stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (captain.dailyStats.date < today) {
            // New day, reset daily stats
            captain.dailyStats = {
                date: new Date(),
                rides: 1,
                earnings: rideData.fare,
                onlineHours: captain.dailyStats.onlineHours || 0
            };
        } else {
            // Same day, add to existing stats
            captain.dailyStats.rides += 1;
            captain.dailyStats.earnings += rideData.fare;
        }

        await captain.save();
        return captain;
    } catch (error) {
        throw new Error(`Failed to update captain stats: ${error.message}`);
    }
}

// Get ride history for captain
async function getCaptainRideHistory(captainId, page = 1, limit = 10) {
    try {
        const skip = (page - 1) * limit;
        
        const rides = await rideModel
            .find({ captain: captainId })
            .populate('user', 'fullname phone')
            .sort({ requestedAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalRides = await rideModel.countDocuments({ captain: captainId });
        
        return {
            rides,
            totalRides,
            currentPage: page,
            totalPages: Math.ceil(totalRides / limit),
            hasMore: skip + rides.length < totalRides
        };
    } catch (error) {
        throw new Error(`Failed to get ride history: ${error.message}`);
    }
}

module.exports = {
    getCaptainAnalytics,
    getSystemAnalytics,
    updateCaptainStats,
    getCaptainRideHistory
};