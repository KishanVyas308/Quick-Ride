const axios = require('axios');
const captainModel = require('../models/captain.model');

module.exports.getAddressCoordinate = async (address) => {
    // Using OpenStreetMap Nominatim API (free)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'quick-ride-app'
            }
        });
        
        if (response.data && response.data.length > 0) {
            const location = response.data[0];
            return {
                ltd: parseFloat(location.lat),
                lng: parseFloat(location.lon)
            };
        } else {
            throw new Error('Unable to fetch coordinates');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    try {
        // Get coordinates for origin and destination
        const originCoords = await module.exports.getAddressCoordinate(origin);
        const destCoords = await module.exports.getAddressCoordinate(destination);

        // Calculate straight-line distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = (destCoords.ltd - originCoords.ltd) * Math.PI / 180;
        const dLon = (destCoords.lng - originCoords.lng) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(originCoords.ltd * Math.PI / 180) * Math.cos(destCoords.ltd * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in km

        // Estimate time (assuming average speed of 40 km/h in city)
        const averageSpeed = 40; // km/h
        const time = (distance / averageSpeed) * 3600; // time in seconds

        return {
            distance: {
                text: `${distance.toFixed(1)} km`,
                value: Math.round(distance * 1000) // in meters
            },
            duration: {
                text: `${Math.round(time / 60)} mins`,
                value: Math.round(time) // in seconds
            }
        };

    } catch (err) {
        console.error(err);
        throw err;
    }
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        return []; // Return empty array instead of throwing error
    }

    // Using OpenStreetMap Nominatim API for autocomplete
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5&addressdetails=1`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'quick-ride-app'
            },
            timeout: 5000 // 5 second timeout
        });
        
        if (response.data && response.data.length > 0) {
            return response.data.map(place => place.display_name).filter(value => value);
        } else {
            return []; // Return empty array instead of throwing error
        }
    } catch (err) {
        console.error('Nominatim API error:', err.message);
        return []; // Return empty array on error
    }
}

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {

    // radius in km


    const captains = await captainModel.find({
        location: {
            $geoWithin: {
                $centerSphere: [ [ ltd, lng ], radius / 6371 ]
            }
        }
    });

    return captains;


}