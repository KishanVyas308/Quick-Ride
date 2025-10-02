const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function getFare(pickup, destination) {

    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    const distanceTime = await mapService.getDistanceTime(pickup, destination);

    const baseFare = {
        auto: 30,
        car: 50,
        moto: 20
    };

    const perKmRate = {
        auto: 10,
        car: 15,
        moto: 8
    };

    const perMinuteRate = {
        auto: 2,
        car: 3,
        moto: 1.5
    };



    const fare = {
        auto: Math.round(baseFare.auto + ((distanceTime.distance.value / 1000) * perKmRate.auto) + ((distanceTime.duration.value / 60) * perMinuteRate.auto)),
        car: Math.round(baseFare.car + ((distanceTime.distance.value / 1000) * perKmRate.car) + ((distanceTime.duration.value / 60) * perMinuteRate.car)),
        moto: Math.round(baseFare.moto + ((distanceTime.distance.value / 1000) * perKmRate.moto) + ((distanceTime.duration.value / 60) * perMinuteRate.moto))
    };

    return fare;


}

module.exports.getFare = getFare;


function getOtp(num) {
    function generateOtp(num) {
        const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
        return otp;
    }
    return generateOtp(num);
}


module.exports.createRide = async ({
    user, pickup, destination, vehicleType, city, captainId
}) => {
    if (!user || !pickup || !destination || !vehicleType || !city) {
        throw new Error('All fields are required');
    }

    const fare = await getFare(pickup, destination);

    const rideData = {
        user,
        pickup,
        destination,
        city,
        vehicleType,
        otp: getOtp(6),
        fare: fare[ vehicleType ],
        estimatedFare: fare[ vehicleType ]
    };

    // If specific captain is selected, assign them
    if (captainId) {
        rideData.captain = captainId;
        rideData.status = 'pending'; // Will wait for captain's acceptance
    }

    const ride = rideModel.create(rideData);

    return ride;
}

module.exports.confirmRide = async ({
    rideId, captain
}) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    if (!captain || !captain._id) {
        throw new Error('Captain is required');
    }

    // Find the ride first to check if it exists
    const existingRide = await rideModel.findById(rideId);
    if (!existingRide) {
        throw new Error('Ride not found');
    }

    // Update the ride status and captain
    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'accepted',
        captain: captain._id
    })

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    return ride;

}

module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw new Error('Ride id and OTP are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'accepted') {
        throw new Error('Ride not accepted');
    }

    console.log('Comparing OTPs:', { provided: otp, stored: ride.otp, type_provided: typeof otp, type_stored: typeof ride.otp });
    
    // Convert both to strings for comparison to avoid type issues
    const providedOtpStr = String(otp).trim();
    const storedOtpStr = String(ride.otp).trim();
    
    if (storedOtpStr !== providedOtpStr) {
        throw new Error(`Invalid OTP. Provided: "${providedOtpStr}", Expected: "${storedOtpStr}"`);
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'ongoing'
    })

    return ride;
}

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'ongoing') {
        throw new Error('Ride not ongoing');
    }

    const updatedRide = await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'completed',
        completedAt: new Date()
    }, { new: true }).populate('user').populate('captain').select('+otp');

    return updatedRide;
}

module.exports.getOtp = getOtp;

