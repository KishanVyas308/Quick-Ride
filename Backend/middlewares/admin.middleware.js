const adminModel = require('../models/admin.model');
const jwt = require('jsonwebtoken');
const blackListTokenModel = require('../models/blackListToken.model');

module.exports.authAdmin = async (req, res, next) => {
    let token = req.cookies.admin_token || req.headers.authorization?.split(' ')[1];

    if (!token && req.headers.authorization) {
        token = req.headers.authorization;
    }

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized - No admin token provided' });
    }

    const isBlacklisted = await blackListTokenModel.findOne({ token: token });

    if (isBlacklisted) {
        return res.status(401).json({ message: 'Unauthorized - Token blacklisted' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const admin = await adminModel.findById(decoded._id);
        
        if (!admin || admin.status !== 'active') {
            return res.status(401).json({ message: 'Unauthorized - Invalid admin or inactive account' });
        }

        req.admin = admin;
        return next();

    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
};

// Middleware to check specific permissions
module.exports.requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!req.admin.hasPermission(permission)) {
            return res.status(403).json({ 
                message: `Insufficient permissions. Required: ${permission}` 
            });
        }

        next();
    };
};

// Middleware to check role
module.exports.requireRole = (roles) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({ 
                message: `Insufficient role. Required: ${allowedRoles.join(' or ')}` 
            });
        }

        next();
    };
};