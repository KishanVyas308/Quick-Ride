import React, { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SocketContext } from '../context/SocketContext'
import { CaptainDataContext } from '../context/CapatainContext'
import axios from 'axios'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CaptainHome = () => {
    const navigate = useNavigate()
    
    // State management
    const [currentLocation, setCurrentLocation] = useState([28.6139, 77.2090])
    const [isOnline, setIsOnline] = useState(false)
    const [incomingRide, setIncomingRide] = useState(null)
    const [currentRide, setCurrentRide] = useState(null)
    const [earnings, setEarnings] = useState({ today: 0, total: 0 })
    const [stats, setStats] = useState({ rides: 0, rating: 4.8 })
    const [showChat, setShowChat] = useState(false)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    
    const { socket } = useContext(SocketContext)
    const { captain } = useContext(CaptainDataContext)

    // Debug function
    const debugAuth = async () => {
        console.log('=== DEBUG AUTH ===')
        console.log('Token:', localStorage.getItem('token'))
        console.log('Captain:', captain)
        console.log('Captain ID:', captain?._id)
        
        // Test the token by calling captain profile
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/captains/profile`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            console.log('Profile test success:', response.data)
        } catch (error) {
            console.error('Profile test failed:', error.response?.data || error.message)
        }

        // Test token debug endpoint
        try {
            const debugResponse = await axios.get(`${import.meta.env.VITE_BASE_URL}/captains/debug-token`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            console.log('Debug token result:', debugResponse.data)
        } catch (error) {
            console.error('Debug token failed:', error.response?.data || error.message)
        }
    }

    // Call debug on component mount
    useEffect(() => {
        if (captain) {
            debugAuth()
        }
    }, [captain])

    // Get current location on load
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords
                    setCurrentLocation([latitude, longitude])
                },
                (error) => console.error('Geolocation error:', error)
            )
        }
    }, [])

    // Socket setup and location updates
    useEffect(() => {
        if (captain && socket) {
            socket.emit('join', {
                userId: captain._id,
                userType: 'captain'
            })
            
            const updateLocation = () => {
                if (navigator.geolocation && isOnline) {
                    navigator.geolocation.getCurrentPosition(position => {
                        socket.emit('update-location-captain', {
                            userId: captain._id,
                            location: {
                                ltd: position.coords.latitude,
                                lng: position.coords.longitude
                            }
                        })
                    })
                }
            }

            let locationInterval
            if (isOnline) {
                locationInterval = setInterval(updateLocation, 10000)
                updateLocation()
            }

            return () => {
                if (locationInterval) clearInterval(locationInterval)
            }
        }
    }, [captain, socket, isOnline])

    // Socket event listeners
    useEffect(() => {
        if (!socket) return

        // Listen for ride requests
        socket.on('ride-request-to-captain', (data) => {
            if (data.captainId === captain._id) {
                setIncomingRide(data)
            }
        })

        // Listen for ride confirmation
        socket.on('ride-confirmed', (data) => {
            setCurrentRide(data)
            setIncomingRide(null)
        })

        // Listen for chat messages
        socket.on('message', (data) => {
            setMessages(prev => [...prev, data.message])
        })

        return () => {
            socket.off('ride-request-to-captain')
            socket.off('ride-confirmed')
            socket.off('message')
        }
    }, [socket, captain])

    // Toggle online status
    const toggleOnlineStatus = async () => {
        try {
            const newStatus = !isOnline
            await axios.patch(`${import.meta.env.VITE_BASE_URL}/captains/status`, {
                status: newStatus ? 'active' : 'inactive'
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setIsOnline(newStatus)
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    // Accept ride request
    const acceptRideRequest = async () => {
        if (!incomingRide) return
        
        try {
            console.log('Accepting ride with token:', localStorage.getItem('token'))
            console.log('Captain data:', captain)
            console.log('Incoming ride data:', incomingRide)
            
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/confirm`, {
                rideId: incomingRide.rideId,
                captainId: captain._id
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            
            console.log('Ride confirmed response:', response.data)
            
            // Send acceptance response
            socket.emit('ride-response', {
                rideId: incomingRide.rideId,
                accepted: true,
                captainId: captain._id
            })
            
            setCurrentRide(response.data)
            setIncomingRide(null)
        } catch (error) {
            console.error('Error accepting ride:', error.response?.data || error.message)
            alert(`Failed to accept ride: ${error.response?.data?.message || error.message}`)
        }
    }

    // Reject ride request
    const rejectRideRequest = () => {
        if (!incomingRide) return
        
        socket.emit('ride-response', {
            rideId: incomingRide.rideId,
            accepted: false,
            captainId: captain._id
        })
        
        setIncomingRide(null)
    }

    // Logout handler
    const handleLogout = async () => {
        try {
            await axios.get(`${import.meta.env.VITE_BASE_URL}/captains/logout`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            localStorage.removeItem('token')
            navigate('/captain-login')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    // Send message to user
    const handleSendMessage = () => {
        if (!newMessage.trim() || !currentRide) return
        
        const message = {
            text: newMessage,
            sender: 'captain',
            timestamp: new Date().toISOString()
        }
        
        socket.emit('message', { rideId: currentRide._id, message })
        setMessages(prev => [...prev, message])
        setNewMessage('')
    }


    return (
        <div className='h-screen relative overflow-hidden bg-gray-50'>
            {/* Header */}
            <div className='absolute top-0 left-0 right-0 z-30 bg-white shadow-sm'>
                <div className='flex items-center justify-between p-4'>
                    <div className='flex items-center gap-3'>
                        <img 
                            className='w-10 h-10' 
                            src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" 
                            alt="Uber" 
                        />
                        <div>
                            <h1 className='font-bold text-lg'>Captain Dashboard</h1>
                            <p className='text-sm text-gray-600'>
                                {captain?.fullname?.firstname} • {captain?.city}
                            </p>
                        </div>
                    </div>
                    
                    <div className='flex items-center gap-3'>
                        {/* Online/Offline Toggle */}
                        <button
                            onClick={toggleOnlineStatus}
                            className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                                isOnline 
                                    ? 'bg-green-500 text-white shadow-lg' 
                                    : 'bg-gray-200 text-gray-700'
                            }`}
                        >
                            {isOnline ? (
                                <><i className="ri-radio-button-line mr-1"></i> Online</>
                            ) : (
                                <><i className="ri-stop-circle-line mr-1"></i> Offline</>
                            )}
                        </button>
                        
                        {/* Debug Button */}
                        <button 
                            onClick={debugAuth}
                            className='px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm hover:bg-blue-100 transition-colors'
                        >
                            Debug
                        </button>

                        {/* Logout */}
                        <button 
                            onClick={handleLogout}
                            className='p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors'
                        >
                            <i className="ri-logout-box-r-line text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className='absolute inset-0 z-0 pt-20 pb-40'>
                <MapContainer 
                    center={currentLocation} 
                    zoom={13}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Captain's location marker */}
                    <Marker position={currentLocation}>
                    </Marker>
                </MapContainer>
            </div>

            {/* Bottom Dashboard */}
            <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl p-6'>
                {/* Stats Overview */}
                <div className='grid grid-cols-3 gap-4 mb-6'>
                    <div className='text-center p-4 bg-green-50 rounded-xl'>
                        <div className='text-2xl font-bold text-green-600'>₹{earnings.today}</div>
                        <div className='text-sm text-green-600'>Today's Earnings</div>
                    </div>
                    <div className='text-center p-4 bg-blue-50 rounded-xl'>
                        <div className='text-2xl font-bold text-blue-600'>{stats.rides}</div>
                        <div className='text-sm text-blue-600'>Total Rides</div>
                    </div>
                    <div className='text-center p-4 bg-yellow-50 rounded-xl'>
                        <div className='flex items-center justify-center gap-1'>
                            <div className='text-2xl font-bold text-yellow-600'>{stats.rating}</div>
                            <i className="ri-star-fill text-yellow-500"></i>
                        </div>
                        <div className='text-sm text-yellow-600'>Rating</div>
                    </div>
                </div>

                {/* Vehicle Info */}
                <div className='bg-gray-100 rounded-xl p-4 mb-4'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                            <div className='w-12 h-12 bg-black rounded-full flex items-center justify-center'>
                                <i className="ri-car-line text-white text-xl"></i>
                            </div>
                            <div>
                                <h3 className='font-semibold'>
                                    {captain?.vehicle?.color} {captain?.vehicle?.vehicleType?.charAt(0).toUpperCase() + captain?.vehicle?.vehicleType?.slice(1)}
                                </h3>
                                <p className='text-sm text-gray-600'>{captain?.vehicle?.plate}</p>
                            </div>
                        </div>
                        <div className='text-right'>
                            <div className='text-sm text-gray-600'>Capacity</div>
                            <div className='font-semibold'>{captain?.vehicle?.capacity} seats</div>
                        </div>
                    </div>
                </div>

                {/* Status Message */}
                <div className='text-center py-4'>
                    {!isOnline ? (
                        <div className='flex items-center justify-center gap-2 text-gray-600'>
                            <i className="ri-pause-circle-line text-xl"></i>
                            <span>You're offline. Turn on to receive ride requests.</span>
                        </div>
                    ) : !incomingRide && !currentRide ? (
                        <div className='flex items-center justify-center gap-2 text-green-600'>
                            <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>You're online and ready for rides!</span>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Incoming Ride Request Modal */}
            {incomingRide && (
                <div className='absolute inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl'>
                        <div className='text-center mb-4'>
                            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3'>
                                <i className="ri-car-line text-2xl text-green-600"></i>
                            </div>
                            <h2 className='text-xl font-bold mb-2'>New Ride Request!</h2>
                            <div className='w-full h-px bg-gray-200 my-4'></div>
                        </div>

                        <div className='space-y-4 mb-6'>
                            <div className='flex items-start gap-3'>
                                <div className='w-3 h-3 bg-green-500 rounded-full mt-2'></div>
                                <div className='flex-1'>
                                    <p className='font-medium text-gray-800'>Pickup</p>
                                    <p className='text-sm text-gray-600'>{incomingRide.pickup}</p>
                                </div>
                            </div>
                            <div className='flex items-start gap-3'>
                                <div className='w-3 h-3 bg-red-500 rounded-full mt-2'></div>
                                <div className='flex-1'>
                                    <p className='font-medium text-gray-800'>Destination</p>
                                    <p className='text-sm text-gray-600'>{incomingRide.destination}</p>
                                </div>
                            </div>
                            <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
                                <i className="ri-car-line text-lg text-gray-600"></i>
                                <span className='font-medium capitalize'>{incomingRide.vehicleType}</span>
                            </div>
                        </div>

                        <div className='flex gap-3'>
                            <button
                                onClick={rejectRideRequest}
                                className='flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors'
                            >
                                Decline
                            </button>
                            <button
                                onClick={acceptRideRequest}
                                className='flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors'
                            >
                                Accept Ride
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Ride Info */}
            {currentRide && (
                <div className='absolute bottom-72 left-4 right-4 z-30 bg-white rounded-2xl shadow-lg p-4'>
                    <div className='flex items-center justify-between mb-3'>
                        <h3 className='font-bold text-lg'>Current Ride</h3>
                        <div className='flex items-center gap-2'>
                            <button
                                onClick={() => setShowChat(!showChat)}
                                className='px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-200'
                            >
                                <i className="ri-chat-3-line mr-1"></i>
                                Chat
                            </button>
                            <span className='px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium'>
                                In Progress
                            </span>
                        </div>
                    </div>
                    <div className='space-y-2 text-sm'>
                        <p><strong>From:</strong> {currentRide.pickup}</p>
                        <p><strong>To:</strong> {currentRide.destination}</p>
                        <p><strong>OTP:</strong> <span className='font-mono bg-yellow-100 px-2 py-1 rounded'>{currentRide.otp}</span></p>
                    </div>
                </div>
            )}

            {/* Chat Modal for Captain */}
            {showChat && currentRide && (
                <div className='absolute inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-2xl w-full max-w-md h-96 flex flex-col'>
                        <div className='p-4 border-b bg-blue-500 text-white rounded-t-2xl'>
                            <div className='flex items-center justify-between'>
                                <h3 className='font-bold'>Chat with Passenger</h3>
                                <button
                                    onClick={() => setShowChat(false)}
                                    className='text-white hover:bg-blue-600 p-1 rounded'
                                >
                                    <i className="ri-close-line text-xl"></i>
                                </button>
                            </div>
                        </div>

                        <div className='flex-1 p-4 overflow-y-auto'>
                            {messages.length === 0 ? (
                                <div className='text-center text-gray-500 mt-8'>
                                    <i className="ri-chat-3-line text-3xl mb-2 block"></i>
                                    <p>No messages yet</p>
                                </div>
                            ) : (
                                <div className='space-y-3'>
                                    {messages.map((message, index) => (
                                        <div 
                                            key={index}
                                            className={`flex ${message.sender === 'captain' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-xs p-3 rounded-lg ${
                                                message.sender === 'captain' 
                                                    ? 'bg-blue-500 text-white' 
                                                    : 'bg-gray-200 text-gray-800'
                                            }`}>
                                                <p>{message.text}</p>
                                                <p className={`text-xs mt-1 ${
                                                    message.sender === 'captain' ? 'text-blue-100' : 'text-gray-500'
                                                }`}>
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className='p-4 border-t'>
                            <div className='flex gap-3'>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className='flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    className='px-6 py-3 bg-blue-500 text-white rounded-full font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600'
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CaptainHome