const adminModel = require('../models/admin.model');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const rideModel = require('../models/ride.model');

// Create admin (for seeding)
async function createAdmin({ firstname, lastname, email, password, role = 'admin', department }) {
    if (!firstname || !lastname || !email || !password) {
        throw new Error('All fields are required');
    }

    const admin = await adminModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        password,
        role,
        department
    });

    return admin;
}

// Get dashboard statistics
async function getDashboardStats() {
    try {
        const [
            totalUsers,
            totalCaptains,
            totalRides,
            completedRides,
            ongoingRides,
            cancelledRides,
            activeDrivers,
            totalRevenue,
            todayRides,
            weekRevenue
        ] = await Promise.all([
            userModel.countDocuments(),
            captainModel.countDocuments(),
            rideModel.countDocuments(),
            rideModel.countDocuments({ status: 'completed' }),
            rideModel.countDocuments({ status: { $in: ['accepted', 'ongoing'] } }),
            rideModel.countDocuments({ status: 'cancelled' }),
            captainModel.countDocuments({ 'availability.isOnline': true }),
            rideModel.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$fare' } } }
            ]),
            rideModel.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }),
            rideModel.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: {
                            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$fare' } } }
            ])
        ]);

        return {
            users: {
                total: totalUsers,
                growth: '+12%' // You can calculate actual growth
            },
            captains: {
                total: totalCaptains,
                active: activeDrivers,
                activePercentage: totalCaptains > 0 ? Math.round((activeDrivers / totalCaptains) * 100) : 0
            },
            rides: {
                total: totalRides,
                completed: completedRides,
                ongoing: ongoingRides,
                cancelled: cancelledRides,
                today: todayRides,
                completionRate: totalRides > 0 ? Math.round((completedRides / totalRides) * 100) : 0
            },
            revenue: {
                total: totalRevenue[0]?.total || 0,
                thisWeek: weekRevenue[0]?.total || 0,
                avgPerRide: completedRides > 0 ? Math.round((totalRevenue[0]?.total || 0) / completedRides) : 0
            }
        };
    } catch (error) {
        throw new Error('Error fetching dashboard stats: ' + error.message);
    }
}

// Get recent activities
async function getRecentActivities(limit = 10) {
    try {
        const recentRides = await rideModel.find()
            .populate('user', 'fullname email')
            .populate('captain', 'fullname email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('status fare pickup destination createdAt');

        const recentUsers = await userModel.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('fullname email createdAt');

        const recentCaptains = await captainModel.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('fullname email createdAt verification.isVerified');

        return {
            rides: recentRides,
            users: recentUsers,
            captains: recentCaptains
        };
    } catch (error) {
        throw new Error('Error fetching recent activities: ' + error.message);
    }
}

// Get system health metrics
async function getSystemHealth() {
    try {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [
            errors24h,
            avgResponseTime,
            activeConnections,
            serverUptime
        ] = await Promise.all([
            // You can implement error logging and fetch from error collection
            Promise.resolve(5), // Placeholder
            Promise.resolve(150), // Placeholder - in ms
            Promise.resolve(45), // Placeholder - active socket connections
            Promise.resolve(Math.floor(process.uptime() / 3600)) // Server uptime in hours
        ]);

        return {
            errors24h,
            avgResponseTime,
            activeConnections,
            serverUptime,
            status: errors24h < 10 && avgResponseTime < 500 ? 'healthy' : 'warning'
        };
    } catch (error) {
        throw new Error('Error fetching system health: ' + error.message);
    }
}

// User management functions
async function getAllUsers(page = 1, limit = 20, search = '', status = '') {
    try {
        const query = {};
        
        if (search) {
            query.$or = [
                { 'fullname.firstname': { $regex: search, $options: 'i' } },
                { 'fullname.lastname': { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await userModel.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await userModel.countDocuments(query);

        return {
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        };
    } catch (error) {
        throw new Error('Error fetching users: ' + error.message);
    }
}

// Captain management functions
async function getAllCaptains(page = 1, limit = 20, search = '', status = '', verified = '') {
    try {
        const query = {};
        
        if (search) {
            query.$or = [
                { 'fullname.firstname': { $regex: search, $options: 'i' } },
                { 'fullname.lastname': { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        if (verified !== '') {
            query['verification.isVerified'] = verified === 'true';
        }

        const captains = await captainModel.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await captainModel.countDocuments(query);

        return {
            captains,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        };
    } catch (error) {
        throw new Error('Error fetching captains: ' + error.message);
    }
}

// Ride management functions
async function getAllRides(page = 1, limit = 20, search = '', status = '', startDate = '', endDate = '') {
    try {
        const query = {};
        
        if (status) {
            query.status = status;
        }

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const rides = await rideModel.find(query)
            .populate('user', 'fullname email')
            .populate('captain', 'fullname email vehicle.plate')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await rideModel.countDocuments(query);

        return {
            rides,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        };
    } catch (error) {
        throw new Error('Error fetching rides: ' + error.message);
    }
}

// Financial reports
async function getFinancialReport(period = 'month') {
    try {
        let startDate;
        const endDate = new Date();

        switch(period) {
            case 'day':
                startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const [
            totalRevenue,
            commissionEarned,
            ridesByVehicle,
            dailyRevenue
        ] = await Promise.all([
            rideModel.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                { $group: { _id: null, total: { $sum: '$fare' } } }
            ]),
            rideModel.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                { $group: { _id: null, total: { $sum: { $multiply: ['$fare', 0.2] } } } }
            ]),
            rideModel.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                { $group: { _id: '$vehicleType', count: { $sum: 1 }, revenue: { $sum: '$fare' } } }
            ]),
            rideModel.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$fare' },
                        rides: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        return {
            totalRevenue: totalRevenue[0]?.total || 0,
            commissionEarned: commissionEarned[0]?.total || 0,
            ridesByVehicle,
            dailyRevenue,
            period
        };
    } catch (error) {
        throw new Error('Error generating financial report: ' + error.message);
    }
}

module.exports = {
    createAdmin,
    getDashboardStats,
    getRecentActivities,
    getSystemHealth,
    getAllUsers,
    getAllCaptains,
    getAllRides,
    getFinancialReport
};