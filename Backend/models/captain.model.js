const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const captainSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [ 3, 'Firstname must be at least 3 characters long' ],
        },
        lastname: {
            type: String,
            minlength: [ 3, 'Lastname must be at least 3 characters long' ],
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [ /^\S+@\S+\.\S+$/, 'Please enter a valid email' ]
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    socketId: {
        type: String,
    },

    status: {
        type: String,
        enum: [ 'active', 'inactive' ],
        default: 'active',
    },

    vehicle: {
        color: {
            type: String,
            required: true,
            minlength: [ 3, 'Color must be at least 3 characters long' ],
        },
        plate: {
            type: String,
            required: true,
            minlength: [ 3, 'Plate must be at least 3 characters long' ],
        },
        capacity: {
            type: Number,
            required: true,
            min: [ 1, 'Capacity must be at least 1' ],
        },
        vehicleType: {
            type: String,
            required: true,
            enum: [ 'car', 'moto', 'auto' ],
        }
    },

    location: {
        ltd: {
            type: Number,
        },
        lng: {
            type: Number,
        }
    },

    city: {
        type: String,
        required: true,
        minlength: [ 2, 'City must be at least 2 characters long' ],
    },

    // Analytics and Performance
    stats: {
        totalRides: {
            type: Number,
            default: 0,
        },
        totalEarnings: {
            type: Number,
            default: 0,
        },
        rating: {
            type: Number,
            default: 5.0,
            min: 0,
            max: 5,
        },
        totalRatings: {
            type: Number,
            default: 0,
        },
        acceptanceRate: {
            type: Number,
            default: 100,
            min: 0,
            max: 100,
        },
        completionRate: {
            type: Number,
            default: 100,
            min: 0,
            max: 100,
        },
    },

    // Daily/Weekly stats
    dailyStats: {
        date: {
            type: Date,
            default: Date.now,
        },
        rides: {
            type: Number,
            default: 0,
        },
        earnings: {
            type: Number,
            default: 0,
        },
        onlineHours: {
            type: Number,
            default: 0,
        },
    },

    // Availability
    availability: {
        isOnline: {
            type: Boolean,
            default: false,
        },
        lastOnlineAt: {
            type: Date,
        },
        totalOnlineHours: {
            type: Number,
            default: 0,
        },
    },

    // Documents and verification
    verification: {
        isVerified: {
            type: Boolean,
            default: false,
        },
        documentsSubmitted: {
            type: Boolean,
            default: false,
        },
        licenseNumber: {
            type: String,
        },
        vehicleRegistration: {
            type: String,
        },
    },

    // Preferences
    preferences: {
        acceptRadius: {
            type: Number,
            default: 5, // km
        },
        preferredAreas: [{
            type: String,
        }],
        workingHours: {
            start: {
                type: String,
                default: '06:00',
            },
            end: {
                type: String,
                default: '22:00',
            },
        },
    },
}, {
    timestamps: true,
})


captainSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
}


captainSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}


captainSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}

const captainModel = mongoose.model('captain', captainSchema)


module.exports = captainModel;