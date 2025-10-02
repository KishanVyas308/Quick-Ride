const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blackListTokenModel = require('../models/blackListToken.model');
const captainModel = require('../models/captain.model');


module.exports.authUser = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }


    const isBlacklisted = await blackListTokenModel.findOne({ token: token });

    if (isBlacklisted) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded._id)

        req.user = user;

        return next();

    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports.authCaptain = async (req, res, next) => {
    let token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    // Also check for authorization header without Bearer prefix
    if (!token && req.headers.authorization) {
        token = req.headers.authorization;
    }

    console.log('Auth Captain - Headers:', req.headers.authorization);
    console.log('Auth Captain - Cookie:', req.cookies.token);
    console.log('Auth Captain - Final token:', token ? token.substring(0, 20) + '...' : 'None');

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    const isBlacklisted = await blackListTokenModel.findOne({ token: token });

    if (isBlacklisted) {
        return res.status(401).json({ message: 'Unauthorized - Token blacklisted' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        
        const captain = await captainModel.findById(decoded._id);
        console.log('Captain search result:', captain);
        
        if (!captain) {
            console.log('Captain not found with ID:', decoded._id);
            // Let's also try to find any captain to see if DB connection works
            const anyCaptain = await captainModel.findOne();
            console.log('Any captain in DB:', anyCaptain ? 'Yes' : 'No');
            return res.status(401).json({ message: 'Unauthorized - Captain not found' });
        }
        
        console.log('Captain authenticated:', captain.fullname.firstname);
        req.captain = captain;

        return next()
    } catch (err) {
        console.log('Auth Captain error:', err);
        res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
}