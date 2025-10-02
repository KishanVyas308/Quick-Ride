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

        // Handle ride requests to specific drivers
        socket.on('ride-request', (data) => {
            const { rideId, captainId, pickup, destination, vehicleType } = data;
            
            // Send ride request to specific captain
            io.emit('ride-request-to-captain', {
                rideId,
                captainId,
                pickup,
                destination,
                vehicleType,
                requesterId: socket.id
            });
        });

        // Handle ride acceptance/rejection by captain
        socket.on('ride-response', (data) => {
            const { rideId, accepted, captainId } = data;
            
            // Send response back to user
            io.emit('ride-response-to-user', {
                rideId,
                accepted,
                captainId,
                responderId: socket.id
            });
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