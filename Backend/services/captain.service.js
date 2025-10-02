const captainModel = require('../models/captain.model');


module.exports.createCaptain = async ({
    firstname, lastname, email, password, color, plate, capacity, vehicleType, city
}) => {
    if (!firstname || !email || !password || !color || !plate || !capacity || !vehicleType || !city) {
        throw new Error('All fields are required');
    }
    const captain = captainModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        password,
        city,
        vehicle: {
            color,
            plate,
            capacity,
            vehicleType
        }
    })

    return captain;
}

// Update captain availability status and track online time
module.exports.updateAvailabilityStatus = async (captainId, isOnline) => {
    const captain = await captainModel.findById(captainId);
    if (!captain) {
        throw new Error('Captain not found');
    }

    const now = new Date();
    
    // If going online
    if (isOnline && !captain.availability.isOnline) {
        captain.availability.isOnline = true;
        captain.availability.lastOnlineAt = now;
        captain.status = 'active';
    }
    // If going offline
    else if (!isOnline && captain.availability.isOnline) {
        captain.availability.isOnline = false;
        
        // Calculate hours worked in this session
        if (captain.availability.lastOnlineAt) {
            const hoursWorked = (now - captain.availability.lastOnlineAt) / (1000 * 60 * 60);
            
            // Update daily stats
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            const dailyStatsDate = captain.dailyStats.date ? 
                captain.dailyStats.date.toISOString().split('T')[0] : null;

            // Reset daily stats if it's a new day
            if (dailyStatsDate !== todayString) {
                captain.dailyStats.date = today;
                captain.dailyStats.rides = 0;
                captain.dailyStats.earnings = 0;
                captain.dailyStats.onlineHours = 0;
            }

            captain.dailyStats.onlineHours += hoursWorked;
            captain.availability.totalOnlineHours += hoursWorked;
        }
        
        captain.status = 'inactive';
    }

    await captain.save();
    return captain;
}

// Get captain earnings dashboard data
module.exports.getCaptainDashboard = async (captainId) => {
    const captain = await captainModel.findById(captainId);
    if (!captain) {
        throw new Error('Captain not found');
    }

    // Check if daily stats need reset
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const dailyStatsDate = captain.dailyStats.date ? 
        captain.dailyStats.date.toISOString().split('T')[0] : null;

    if (dailyStatsDate !== todayString) {
        captain.dailyStats = {
            date: today,
            rides: 0,
            earnings: 0,
            onlineHours: captain.dailyStats.onlineHours || 0
        };
        await captain.save();
    }

    return {
        personalInfo: {
            name: `${captain.fullname.firstname} ${captain.fullname.lastname || ''}`,
            email: captain.email,
            city: captain.city,
            isVerified: captain.verification.isVerified
        },
        vehicleInfo: captain.vehicle,
        stats: captain.stats,
        dailyStats: captain.dailyStats,
        availability: captain.availability,
        rating: captain.stats.rating,
        totalEarnings: captain.stats.totalEarnings,
        totalRides: captain.stats.totalRides
    };
}