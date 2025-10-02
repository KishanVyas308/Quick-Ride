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
    
    // Enhanced state management
    const [currentLocation, setCurrentLocation] = useState([28.6139, 77.2090])
    const [isOnline, setIsOnline] = useState(false)
    const [incomingRide, setIncomingRide] = useState(null)
    const [currentRide, setCurrentRide] = useState(null)
    const [earnings, setEarnings] = useState({ 
        today: { totalEarnings: 0, totalRides: 0 }, 
        week: { totalEarnings: 0, totalRides: 0 },
        month: { totalEarnings: 0, totalRides: 0 },
        total: 0 
    })
    const [stats, setStats] = useState({ 
        rides: 0, 
        rating: 4.8, 
        acceptance: 85,
        completion: 95,
        onlineHours: 0
    })
    const [earningsAnalytics, setEarningsAnalytics] = useState(null)
    const [showChat, setShowChat] = useState(false)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [notifications, setNotifications] = useState([])
    const [rideHistory, setRideHistory] = useState([])
    const [locationPermission, setLocationPermission] = useState('pending')
    const [networkStatus, setNetworkStatus] = useState('online')
    
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

    // Enhanced earnings and analytics fetching
    const fetchAnalytics = async () => {
        if (!captain?._id) return
        
        try {
            setLoading(true)
            
            // Fetch comprehensive earnings analytics
            const earningsResponse = await axios.get(`${import.meta.env.VITE_BASE_URL}/earnings/analytics`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            
            const earningsData = earningsResponse.data.data
            
            setEarningsAnalytics(earningsData)
            
            setEarnings({
                today: earningsData.analytics.today,
                week: earningsData.analytics.week,
                month: earningsData.analytics.month,
                total: earningsData.performance.totalLifetimeEarnings
            })
            
            setStats({
                rides: earningsData.performance.totalLifetimeRides,
                rating: earningsData.performance.rating,
                acceptance: earningsData.performance.acceptanceRate,
                completion: earningsData.performance.completionRate,
                onlineHours: 0 // Will be updated separately
            })

            console.log('Earnings analytics loaded:', earningsData)
            
        } catch (error) {
            console.error('Error fetching earnings analytics:', error)
            setError('Failed to load earnings data')
        } finally {
            setLoading(false)
        }
    }

    // Fetch daily stats
    const fetchDailyStats = async () => {
        if (!captain?._id) return
        
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/earnings/daily-stats`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            
            const dailyData = response.data.data
            setStats(prev => ({
                ...prev,
                onlineHours: dailyData.dailyStats.onlineHours || 0
            }))
            
        } catch (error) {
            console.error('Error fetching daily stats:', error)
        }
    }

    const fetchRideHistory = async () => {
        if (!captain?._id) return
        
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/analytics/captain/${captain._id}/rides?limit=5`)
            setRideHistory(response.data.rides || [])
        } catch (error) {
            console.error('Error fetching ride history:', error)
        }
    }

    // Call functions on component mount
    useEffect(() => {
        if (captain) {
            debugAuth()
            fetchAnalytics()
            fetchDailyStats()
            fetchRideHistory()
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

        // Listen for ride ended by user
        socket.on('ride-ended-by-user', (data) => {
            if (data.captainId === captain._id) {
                alert('User has ended the ride')
                setCurrentRide(null)
                setMessages([])
            }
        })

        // Listen for earnings updates
        socket.on('earnings-updated', (data) => {
            console.log('Earnings updated:', data)
            
            // Update earnings display
            setEarnings(prev => ({
                ...prev,
                today: {
                    ...prev.today,
                    totalEarnings: data.updatedStats.totalEarnings
                },
                total: data.updatedStats.totalEarnings
            }))

            setStats(prev => ({
                ...prev,
                rides: data.updatedStats.totalRides,
                rating: data.updatedStats.rating,
                acceptance: data.updatedStats.acceptanceRate,
                completion: data.updatedStats.completionRate
            }))

            // Show earnings notification
            const message = `Ride completed! Earned ₹${data.earnings.totalEarnings} ${data.earnings.bonus > 0 ? `(+₹${data.earnings.bonus} bonus)` : ''}`
            alert(message)
        })

        return () => {
            socket.off('ride-request-to-captain')
            socket.off('ride-confirmed')
            socket.off('message')
            socket.off('ride-ended-by-user')
            socket.off('earnings-updated')
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

    // Notify user that driver is arriving
    const notifyDriverArriving = () => {
        if (!currentRide) return
        
        socket.emit('driver-status-update', {
            rideId: currentRide._id,
            status: 'arriving',
            message: 'Driver is on the way to pickup location'
        })
        
        alert('User notified that you are arriving!')
    }

    // Notify user that driver has arrived
    const notifyDriverArrived = () => {
        if (!currentRide) return
        
        socket.emit('driver-status-update', {
            rideId: currentRide._id,
            status: 'arrived',
            message: 'Driver has arrived at pickup location'
        })
        
        alert('User notified that you have arrived!')
    }

    // Start the trip (after OTP verification)
    const startTrip = async () => {
        if (!currentRide) return
        
        const otp = prompt('Enter the OTP provided by the user:')
        if (!otp) return
        
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/start-ride?rideId=${currentRide._id}&otp=${otp}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            
            socket.emit('trip-status-update', {
                rideId: currentRide._id,
                status: 'started',
                message: 'Trip has started'
            })
            
            alert('Trip started successfully!')
            
        } catch (error) {
            console.error('Error starting trip:', error)
            alert('Invalid OTP or error starting trip. Please try again.')
        }
    }

    // End the trip
    const endTrip = async () => {
        if (!currentRide) return
        
        if (!confirm('Are you sure you want to end this trip?')) return
        
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/end-ride`, {
                rideId: currentRide._id
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            
            socket.emit('trip-status-update', {
                rideId: currentRide._id,
                status: 'ended',
                message: 'Trip has been completed'
            })
            
            alert('Trip completed successfully!')
            setCurrentRide(null)
            setMessages([])
            
        } catch (error) {
            console.error('Error ending trip:', error)
            alert('Error ending trip. Please try again.')
        }
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
                            <div className='flex items-center gap-3 text-sm'>
                                <span className='text-gray-600'>
                                    {captain?.fullname?.firstname} • {captain?.city}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {isOnline ? '🟢 Online' : '🔴 Offline'}
                                </span>
                            </div>
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
                {/* Enhanced Stats Overview */}
                <div className='grid grid-cols-2 gap-4 mb-4'>
                    <div className='p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl'>
                        <div className='flex items-center justify-between mb-2'>
                            <i className="ri-money-dollar-circle-line text-2xl opacity-80"></i>
                            <span className='text-xs opacity-80'>TODAY</span>
                        </div>
                        <div className='text-2xl font-bold'>₹{earnings.today.totalEarnings || 0}</div>
                        <div className='text-sm opacity-90'>
                            {earnings.today.totalRides || 0} rides • ₹{earnings.today.totalRides > 0 ? Math.round(earnings.today.totalEarnings / earnings.today.totalRides) : 0} avg
                        </div>
                    </div>
                    
                    <div className='p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl'>
                        <div className='flex items-center justify-between mb-2'>
                            <i className="ri-car-line text-2xl opacity-80"></i>
                            <span className='text-xs opacity-80'>TOTAL</span>
                        </div>
                        <div className='text-2xl font-bold'>{stats.rides}</div>
                        <div className='text-sm opacity-90'>₹{earnings.total} earned</div>
                    </div>
                </div>

                {/* Weekly and Monthly Stats */}
                <div className='grid grid-cols-2 gap-4 mb-4'>
                    <div className='p-3 bg-purple-50 rounded-lg'>
                        <div className='flex items-center justify-between mb-1'>
                            <i className="ri-calendar-week-line text-purple-600"></i>
                            <span className='text-xs text-purple-600 font-medium'>THIS WEEK</span>
                        </div>
                        <div className='text-lg font-bold text-purple-700'>₹{earnings.week.totalEarnings || 0}</div>
                        <div className='text-xs text-purple-600'>{earnings.week.totalRides || 0} rides</div>
                    </div>
                    
                    <div className='p-3 bg-orange-50 rounded-lg'>
                        <div className='flex items-center justify-between mb-1'>
                            <i className="ri-calendar-line text-orange-600"></i>
                            <span className='text-xs text-orange-600 font-medium'>THIS MONTH</span>
                        </div>
                        <div className='text-lg font-bold text-orange-700'>₹{earnings.month.totalEarnings || 0}</div>
                        <div className='text-xs text-orange-600'>{earnings.month.totalRides || 0} rides</div>
                    </div>
                </div>

                <div className='grid grid-cols-4 gap-2 mb-6'>
                    <div className='text-center p-3 bg-yellow-50 rounded-lg'>
                        <div className='flex items-center justify-center gap-1 mb-1'>
                            <div className='text-lg font-bold text-yellow-600'>{stats.rating.toFixed(1)}</div>
                            <i className="ri-star-fill text-yellow-500 text-sm"></i>
                        </div>
                        <div className='text-xs text-yellow-600'>Rating</div>
                    </div>
                    
                    <div className='text-center p-3 bg-green-50 rounded-lg'>
                        <div className='text-lg font-bold text-green-600'>{stats.acceptance}%</div>
                        <div className='text-xs text-green-600'>Accept</div>
                    </div>
                    
                    <div className='text-center p-3 bg-blue-50 rounded-lg'>
                        <div className='text-lg font-bold text-blue-600'>{stats.completion}%</div>
                        <div className='text-xs text-blue-600'>Complete</div>
                    </div>
                    
                    <div className='text-center p-3 bg-indigo-50 rounded-lg'>
                        <div className='text-lg font-bold text-indigo-600'>{stats.onlineHours.toFixed(1)}h</div>
                        <div className='text-xs text-indigo-600'>Online</div>
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
                    <div className='space-y-2 text-sm mb-4'>
                        <p><strong>From:</strong> {currentRide.pickup}</p>
                        <p><strong>To:</strong> {currentRide.destination}</p>
                        <p><strong>OTP:</strong> <span className='font-mono bg-yellow-100 px-2 py-1 rounded'>{currentRide.otp}</span></p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className='grid grid-cols-2 gap-2 mb-3'>
                        <button
                            onClick={notifyDriverArriving}
                            className='px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600'
                        >
                            <i className="ri-navigation-line mr-1"></i>
                            Arriving
                        </button>
                        <button
                            onClick={notifyDriverArrived}
                            className='px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600'
                        >
                            <i className="ri-map-pin-line mr-1"></i>
                            Arrived
                        </button>
                        <button
                            onClick={startTrip}
                            className='px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600'
                        >
                            <i className="ri-play-circle-line mr-1"></i>
                            Start Trip
                        </button>
                        <button
                            onClick={endTrip}
                            className='px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600'
                        >
                            <i className="ri-stop-circle-line mr-1"></i>
                            End Trip
                        </button>
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
                                                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Now'}
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