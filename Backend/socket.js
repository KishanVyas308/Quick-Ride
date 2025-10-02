const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');

let io;

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: '*',
            methods: [ 'GET', 'POST' ]
        }
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);


        socket.on('join', async (data) => {
            const { userId, userType } = data;

            if (userType === 'user') {
                await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } else if (userType === 'captain') {
                await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
            }
        });


        socket.on('update-location-captain', async (data) => {
            const { userId, location } = data;

            if (!location || !location.ltd || !location.lng) {
                return socket.emit('error', { message: 'Invalid location data' });
            }

            await captainModel.findByIdAndUpdate(userId, {
                location: {
                    ltd: location.ltd,
                    lng: location.lng
                }
            });
        });

        // Handle ride acceptance/rejection by captain
        socket.on('ride-response', async (data) => {
            const { rideId, accepted, captainId } = data;
            
            try {
                const ride = await require('./models/ride.model').findById(rideId).populate('user');
                
                if (accepted) {
                    // Update ride status and captain
                    await require('./models/ride.model').findByIdAndUpdate(rideId, {
                        captain: captainId,
                        status: 'accepted'
                    });
                    
                    // Notify user that ride was accepted
                    if (ride && ride.user && ride.user.socketId) {
                        io.to(ride.user.socketId).emit('ride-confirmed', {
                            ...ride.toObject(),
                            captain: await require('./models/captain.model').findById(captainId)
                        });
                    }
                } else {
                    // Notify user that ride was rejected
                    if (ride && ride.user && ride.user.socketId) {
                        io.to(ride.user.socketId).emit('ride-rejected', {
                            rideId,
                            message: 'Driver declined your ride request'
                        });
                    }
                }
            } catch (error) {
                console.error('Error handling ride response:', error);
            }
        });

        // Handle chat messages
        socket.on('message', (data) => {
            const { rideId, message } = data;
            
            // Broadcast message to all users in the ride
            socket.broadcast.emit('message', {
                rideId,
                message
            });
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

const sendMessageToSocketId = (socketId, messageObject) => {

console.log(messageObject);

    if (io) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    } else {
        console.log('Socket.io not initialized.');
    }
}

module.exports = { initializeSocket, sendMessageToSocketId };