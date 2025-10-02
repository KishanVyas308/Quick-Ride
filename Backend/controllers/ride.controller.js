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
        
        // Create version without OTP for captains (security)
        const rideForCaptains = {
            ...rideWithUser.toObject(),
            otp: undefined
        };
        
        // Send response with OTP
        // Send different response to rider and captain
        // Rider gets full ride info including OTP
        // Captain gets ride info without OTP (for security)
        const riderResponse = {
            message: 'Ride created successfully',
            ride: ride
        };

        const captainResponse = {
            message: 'Ride created successfully',
            ride: {
                ...ride.toObject(),
                otp: undefined // Remove OTP from captain's view
            }
        };

        res.status(201).json(riderResponse);

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
                    data: rideForCaptains
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

module.exports.resendOtp = async (req, res) => {
    const { rideId } = req.body;
    const userId = req.user._id;

    try {
        // Find the ride and verify it belongs to the user
        const ride = await rideModel.findById(rideId);
        
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        if (ride.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (ride.status !== 'accepted') {
            return res.status(400).json({ message: 'OTP can only be resent for accepted rides' });
        }

        // Generate new OTP
        const newOtp = rideService.getOtp(6);
        
        console.log('Generating new OTP:', newOtp);
        
        // Update ride with new OTP
        const updatedRide = await rideModel.findByIdAndUpdate(rideId, { otp: newOtp }, { new: true });
        
        console.log('Updated ride with new OTP:', updatedRide.otp);

        res.json({ 
            message: 'OTP resent successfully', 
            otp: newOtp 
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        console.log('Ending ride:', rideId, 'for captain:', req.captain._id);
        const ride = await rideService.endRide({ rideId, captain: req.captain });
        console.log('Ride ended successfully:', ride.status, 'fare:', ride.fare);

        // Calculate and update earnings
        const EarningsService = require('../services/earnings.service');
        
        try {
            // Calculate ride earnings
            console.log('Calculating earnings for ride:', ride._id, 'fare:', ride.fare);
            const earningsData = await EarningsService.calculateRideEarnings(ride);
            console.log('Earnings calculated:', earningsData);
            
            // Update captain earnings
            const updatedEarnings = await EarningsService.updateCaptainEarnings(
                ride.captain._id, 
                earningsData
            );

            // Send ride completion notification with earnings
            sendMessageToSocketId(ride.user.socketId, {
                event: 'ride-ended',
                data: {
                    ...ride.toObject(),
                    earningsCalculated: true
                }
            });

            // Send earnings update to captain
            if (ride.captain.socketId) {
                sendMessageToSocketId(ride.captain.socketId, {
                    event: 'earnings-updated',
                    data: {
                        rideId: ride._id,
                        earnings: earningsData,
                        updatedStats: updatedEarnings.updatedStats,
                        dailyStats: updatedEarnings.dailyStats
                    }
                });
            }

            console.log(`Ride ${rideId} completed. Captain earned: ₹${earningsData.totalEarnings}`);

            return res.status(200).json({
                ride,
                earnings: earningsData,
                updatedStats: updatedEarnings.updatedStats
            });

        } catch (earningsError) {
            console.error('Error calculating earnings:', earningsError);
            
            // Still send basic ride completion even if earnings calculation fails
            sendMessageToSocketId(ride.user.socketId, {
                event: 'ride-ended',
                data: ride
            });

            return res.status(200).json({
                ride,
                earningsError: 'Could not calculate earnings automatically'
            });
        }

    } catch (err) {
        return res.status(500).json({ message: err.message });
    } s
}