const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const blackListTokenModel = require('../models/blackListToken.model');
const { validationResult } = require('express-validator');


module.exports.registerCaptain = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle, city } = req.body;

    const isCaptainAlreadyExist = await captainModel.findOne({ email });

    if (isCaptainAlreadyExist) {
        return res.status(400).json({ message: 'Captain already exist' });
    }


    const hashedPassword = await captainModel.hashPassword(password);

    const captain = await captainService.createCaptain({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword,
        color: vehicle.color,
        plate: vehicle.plate,
        capacity: vehicle.capacity,
        vehicleType: vehicle.vehicleType,
        city
    });

    const token = captain.generateAuthToken();

    res.status(201).json({ token, captain });

}

module.exports.loginCaptain = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const captain = await captainModel.findOne({ email }).select('+password');

    if (!captain) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await captain.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Set captain status to active when they log in
    await captainModel.findByIdAndUpdate(captain._id, { status: 'active' });
    captain.status = 'active';

    const token = captain.generateAuthToken();

    res.cookie('token', token);

    res.status(200).json({ token, captain });
}

module.exports.getCaptainProfile = async (req, res, next) => {
    res.status(200).json({ captain: req.captain });
}

module.exports.logoutCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    // Set captain status to inactive when they log out
    await captainModel.findByIdAndUpdate(req.captain._id, { status: 'inactive' });

    await blackListTokenModel.create({ token });

    res.clearCookie('token');

    res.status(200).json({ message: 'Logout successfully' });
}

module.exports.getAvailableDrivers = async (req, res, next) => {
    const { city, vehicleType } = req.query;

    if (!city) {
        return res.status(400).json({ message: 'City is required' });
    }

    try {
        console.log('Searching for drivers with:', { city, vehicleType });
        
        const query = {
            city: city,
            status: 'active',
            ...(vehicleType && { 'vehicle.vehicleType': vehicleType })
        };
        
        console.log('Final query:', query);
        
        const drivers = await captainModel.find(query).select('-password');
        
        console.log('Found drivers:', drivers.length);

        res.status(200).json({ drivers });
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({ message: 'Error fetching drivers', error: error.message });
    }
}

module.exports.updateCaptainStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be active or inactive' });
        }

        await captainModel.findByIdAndUpdate(req.captain._id, { status });
        
        res.status(200).json({ message: `Status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
}

// Debug route to list all captains
module.exports.getAllCaptains = async (req, res, next) => {
    try {
        const captains = await captainModel.find({}).select('-password');
        console.log('All captains in DB:', captains.map(c => ({
            id: c._id,
            name: c.fullname.firstname,
            email: c.email,
            city: c.city,
            status: c.status,
            vehicleType: c.vehicle.vehicleType
        })));
        res.status(200).json({ captains });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching captains', error: error.message });
    }
}

// Debug route to test token
module.exports.debugToken = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];
        console.log('Debug - Raw token:', token);
        
        if (token) {
            const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
            console.log('Debug - Decoded:', decoded);
            
            const captain = await captainModel.findById(decoded._id);
            console.log('Debug - Captain found:', captain ? 'Yes' : 'No');
            
            res.status(200).json({ 
                decoded, 
                captain: captain ? {
                    id: captain._id,
                    name: captain.fullname.firstname,
                    email: captain.email
                } : null 
            });
        } else {
            res.status(400).json({ message: 'No token provided' });
        }
    } catch (error) {
        console.log('Debug token error:', error);
        res.status(500).json({ message: 'Token debug error', error: error.message });
    }
}