const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');


module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, pickup, destination, vehicleType, city, captainId } = req.body;

    try {
        // Use userId from request body if available, otherwise use authenticated user
        const userIdToUse = userId || (req.user && req.user._id);
        
        if (!userIdToUse) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        const ride = await rideService.createRide({ user: userIdToUse, pickup, destination, vehicleType, city, captainId });
        
        const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
        const captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoordinates.ltd, pickupCoordinates.lng, 2);

        const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user').select('+otp');
        
        // Send response with OTP
        res.status(201).json(rideWithUser);

        // If a specific captain was selected, send request directly to them
        if (captainId) {
            const selectedCaptain = await require('../models/captain.model').findById(captainId);
            if (selectedCaptain && selectedCaptain.socketId) {
                sendMessageToSocketId(selectedCaptain.socketId, {
                    event: 'ride-request-to-captain',
                    data: {
                        rideId: ride._id,
                        captainId: captainId,
                        pickup,
                        destination,
                        vehicleType,
                        user: rideWithUser.user
                    }
                });
            }
        } else {
            // Original logic for broadcasting to captains in radius
            captainsInRadius.map(captain => {
                sendMessageToSocketId(captain.socketId, {
                    event: 'new-ride',
                    data: rideWithUser
                })
            });
        }

    } catch (err) {

        console.log(err);
        return res.status(500).json({ message: err.message });
    }

};

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, captainId } = req.body;

    try {
        console.log('Confirming ride:', { rideId, captainId });
        
        // If no captainId provided, get it from the ride
        let actualCaptainId = captainId;
        if (!actualCaptainId) {
            const ride = await rideModel.findById(rideId);
            if (ride && ride.captain) {
                actualCaptainId = ride.captain;
            } else {
                return res.status(400).json({ message: 'Captain ID required' });
            }
        }

        // Get captain details
        const captain = await captainModel.findById(actualCaptainId);
        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }

        const confirmedRide = await rideService.confirmRide({ rideId, captain });

        sendMessageToSocketId(confirmedRide.user.socketId, {
            event: 'ride-confirmed',
            data: confirmedRide
        })

        return res.status(200).json(confirmedRide);
    } catch (err) {
        console.log('Confirm ride error:', err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        console.log(ride);

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-started',
            data: ride
        })

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-ended',
            data: ride
        })



        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    } s
}