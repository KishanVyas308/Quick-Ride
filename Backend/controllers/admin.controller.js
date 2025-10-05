const adminModel = require('../models/admin.model');
const adminService = require('../services/admin.service');
const blackListTokenModel = require('../models/blackListToken.model');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const rideModel = require('../models/ride.model');
const { validationResult } = require('express-validator');

// Admin authentication
module.exports.registerAdmin = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, role, department } = req.body;

    try {
        const isAdminAlreadyExist = await adminModel.findOne({ email });

        if (isAdminAlreadyExist) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const hashedPassword = await adminModel.hashPassword(password);

        const admin = await adminService.createAdmin({
            firstname: fullname.firstname,
            lastname: fullname.lastname,
            email,
            password: hashedPassword,
            role: role || 'admin',
            department
        });

        const token = admin.generateAuthToken();

        res.status(201).json({ 
            token, 
            admin: {
                _id: admin._id,
                fullname: admin.fullname,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                department: admin.department
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.loginAdmin = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const admin = await adminModel.findOne({ email }).select('+password');

        if (!admin || admin.status !== 'active') {
            return res.status(401).json({ message: 'Invalid credentials or account inactive' });
        }

        const isMatch = await admin.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        const token = admin.generateAuthToken();

        res.cookie('admin_token', token);

        res.status(200).json({ 
            token, 
            admin: {
                _id: admin._id,
                fullname: admin.fullname,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                department: admin.department
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getAdminProfile = async (req, res, next) => {
    res.status(200).json({ admin: req.admin });
};

module.exports.logoutAdmin = async (req, res, next) => {
    const token = req.cookies.admin_token || req.headers.authorization?.split(' ')[1];

    await blackListTokenModel.create({ token });

    res.clearCookie('admin_token');

    res.status(200).json({ message: 'Logout successful' });
};

// Dashboard
module.exports.getDashboard = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('view_analytics')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const [stats, activities, systemHealth] = await Promise.all([
            adminService.getDashboardStats(),
            adminService.getRecentActivities(),
            adminService.getSystemHealth()
        ]);

        res.status(200).json({
            stats,
            activities,
            systemHealth
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// User Management
module.exports.getUsers = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('view_users')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { page = 1, limit = 20, search = '', status = '' } = req.query;

        const result = await adminService.getAllUsers(page, limit, search, status);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getUserDetails = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('view_users')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { userId } = req.params;

        const user = await userModel.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's ride history
        const rides = await rideModel.find({ user: userId })
            .populate('captain', 'fullname vehicle')
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({ user, rides });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.updateUserStatus = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('manage_users')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { userId } = req.params;
        const { status } = req.body;

        const user = await userModel.findByIdAndUpdate(
            userId, 
            { status }, 
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User status updated', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Captain Management
module.exports.getCaptains = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('view_captains')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { page = 1, limit = 20, search = '', status = '', verified = '' } = req.query;

        const result = await adminService.getAllCaptains(page, limit, search, status, verified);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getCaptainDetails = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('view_captains')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { captainId } = req.params;

        const captain = await captainModel.findById(captainId).select('-password');
        
        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }

        // Get captain's ride history
        const rides = await rideModel.find({ captain: captainId })
            .populate('user', 'fullname')
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({ captain, rides });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.updateCaptainStatus = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('manage_captains')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { captainId } = req.params;
        const { status } = req.body;

        const captain = await captainModel.findByIdAndUpdate(
            captainId, 
            { status }, 
            { new: true }
        ).select('-password');

        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }

        res.status(200).json({ message: 'Captain status updated', captain });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.verifyCaptain = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('verify_captains')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { captainId } = req.params;
        const { isVerified } = req.body;

        const captain = await captainModel.findByIdAndUpdate(
            captainId, 
            { 'verification.isVerified': isVerified }, 
            { new: true }
        ).select('-password');

        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }

        res.status(200).json({ 
            message: `Captain ${isVerified ? 'verified' : 'unverified'} successfully`, 
            captain 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Ride Management
module.exports.getRides = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('view_rides')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { page = 1, limit = 20, search = '', status = '', startDate = '', endDate = '' } = req.query;

        const result = await adminService.getAllRides(page, limit, search, status, startDate, endDate);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getRideDetails = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('view_rides')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { rideId } = req.params;

        const ride = await rideModel.findById(rideId)
            .populate('user', 'fullname email')
            .populate('captain', 'fullname email vehicle');

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        res.status(200).json({ ride });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.cancelRide = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('manage_rides')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { rideId } = req.params;
        const { reason } = req.body;

        const ride = await rideModel.findByIdAndUpdate(
            rideId,
            { 
                status: 'cancelled',
                cancellationReason: reason || 'Cancelled by admin'
            },
            { new: true }
        );

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        res.status(200).json({ message: 'Ride cancelled successfully', ride });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Financial Reports
module.exports.getFinancialReport = async (req, res, next) => {
    try {
        if (!req.admin.hasPermission('financial_reports')) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { period = 'month' } = req.query;

        const report = await adminService.getFinancialReport(period);

        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};