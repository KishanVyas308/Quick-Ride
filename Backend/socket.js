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
                    
                    // Get the updated ride with OTP
                    const updatedRide = await require('./models/ride.model').findById(rideId).populate('user').select('+otp');
                    
                    // Notify user that ride was accepted
                    if (updatedRide && updatedRide.user && updatedRide.user.socketId) {
                        const captain = await require('./models/captain.model').findById(captainId);
                        io.to(updatedRide.user.socketId).emit('ride-confirmed', {
                            ...updatedRide.toObject(),
                            captain: captain
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
        socket.on('message', async (data) => {
            const { rideId, message } = data;
            
            try {
                // Find the ride to get user and captain info
                const ride = await require('./models/ride.model').findById(rideId).populate('user captain');
                
                if (ride) {
                    // Send to user if message is from captain
                    if (message.sender === 'captain' && ride.user && ride.user.socketId) {
                        io.to(ride.user.socketId).emit('message', message);
                    }
                    // Send to captain if message is from user  
                    else if (message.sender === 'user' && ride.captain && ride.captain.socketId) {
                        io.to(ride.captain.socketId).emit('message', message);
                    }
                }
            } catch (error) {
                console.error('Error handling chat message:', error);
            }
        });

        // Handle ride ended by user
        socket.on('ride-ended-by-user', async (data) => {
            const { rideId, captainId, message } = data;
            
            try {
                // Update ride status to completed
                await require('./models/ride.model').findByIdAndUpdate(rideId, {
                    status: 'completed'
                });
                
                // Find captain and notify them
                const captain = await captainModel.findById(captainId);
                if (captain && captain.socketId) {
                    io.to(captain.socketId).emit('ride-ended-by-user', {
                        rideId,
                        captainId,
                        message
                    });
                }
            } catch (error) {
                console.error('Error handling ride end by user:', error);
            }
        });

        // Handle driver status updates (arriving, arrived)
        socket.on('driver-status-update', async (data) => {
            const { rideId, status, message } = data;
            
            try {
                const ride = await require('./models/ride.model').findById(rideId).populate('user');
                
                if (ride && ride.user && ride.user.socketId) {
                    if (status === 'arriving') {
                        io.to(ride.user.socketId).emit('driver-arriving', {
                            rideId,
                            message
                        });
                    } else if (status === 'arrived') {
                        io.to(ride.user.socketId).emit('driver-arrived', {
                            rideId,
                            message
                        });
                    }
                }
            } catch (error) {
                console.error('Error handling driver status update:', error);
            }
        });

        // Handle trip status updates (started, ended)
        socket.on('trip-status-update', async (data) => {
            const { rideId, status, message } = data;
            
            try {
                const ride = await require('./models/ride.model').findById(rideId).populate('user');
                
                if (ride && ride.user && ride.user.socketId) {
                    if (status === 'started') {
                        // Update ride status in database
                        await require('./models/ride.model').findByIdAndUpdate(rideId, {
                            status: 'ongoing'
                        });
                        
                        io.to(ride.user.socketId).emit('trip-started', {
                            rideId,
                            message
                        });
                    } else if (status === 'ended') {
                        // Update ride status in database
                        await require('./models/ride.model').findByIdAndUpdate(rideId, {
                            status: 'completed'
                        });
                        
                        io.to(ride.user.socketId).emit('trip-ended', {
                            rideId,
                            message
                        });
                    }
                }
            } catch (error) {
                console.error('Error handling trip status update:', error);
            }
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