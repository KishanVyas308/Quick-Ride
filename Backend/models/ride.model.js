const mongoose = require('mongoose');


const rideSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'captain',
    },
    pickup: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    vehicleType: {
        type: String,
        enum: [ 'car', 'moto', 'auto' ],
        required: true,
    },
    fare: {
        type: Number,
        required: true,
    },
    baseFare: {
        type: Number,
    },
    surgePricing: {
        type: Number,
        default: 1.0,
    },
    estimatedFare: {
        type: Number,
    },

    status: {
        type: String,
        enum: [ 'pending', 'accepted', "ongoing", 'completed', 'cancelled' ],
        default: 'pending',
    },

    duration: {
        type: Number,
    }, // in seconds
    estimatedDuration: {
        type: Number,
    }, // estimated duration in minutes

    distance: {
        type: Number,
    }, // in meters
    estimatedDistance: {
        type: Number,
    }, // estimated distance in km

    // Timestamps
    requestedAt: {
        type: Date,
        default: Date.now,
    },
    acceptedAt: {
        type: Date,
    },
    startedAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },

    // Location coordinates
    pickupCoordinates: {
        lat: Number,
        lng: Number,
    },
    destinationCoordinates: {
        lat: Number,
        lng: Number,
    },

    // Rating and feedback
    userRating: {
        type: Number,
        min: 1,
        max: 5,
    },
    captainRating: {
        type: Number,
        min: 1,
        max: 5,
    },
    feedback: {
        type: String,
    },

    paymentID: {
        type: String,
    },
    orderId: {
        type: String,
    },
    signature: {
        type: String,
    },

    otp: {
        type: String,
        select: false,
        required: true,
    },
})

module.exports = mongoose.model('ride', rideSchema);