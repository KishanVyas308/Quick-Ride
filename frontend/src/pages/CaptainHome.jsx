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
    const [showOtpModal, setShowOtpModal] = useState(false)
    const [otpInput, setOtpInput] = useState('')
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
            
            // Fetch comprehensive earnings analytics with retry logic
            let earningsData = null
            let retryCount = 0
            const maxRetries = 3
            
            while (retryCount < maxRetries && !earningsData) {
                try {
                    const earningsResponse = await axios.get(`${import.meta.env.VITE_BASE_URL}/earnings/analytics`, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('token')}`
                        },
                        timeout: 10000
                    })
                    
                    earningsData = earningsResponse.data.data
                    break
                } catch (err) {
                    retryCount++
                    console.warn(`Earnings fetch attempt ${retryCount} failed:`, err.message)
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                    }
                }
            }
            
            if (earningsData) {
                setEarningsAnalytics(earningsData)
                
                setEarnings({
                    today: earningsData.analytics.today || { totalEarnings: 0, totalRides: 0 },
                    week: earningsData.analytics.week || { totalEarnings: 0, totalRides: 0 },
                    month: earningsData.analytics.month || { totalEarnings: 0, totalRides: 0 },
                    total: earningsData.performance?.totalLifetimeEarnings || 0
                })
                
                setStats({
                    rides: earningsData.performance?.totalLifetimeRides || 0,
                    rating: earningsData.performance?.rating || 4.8,
                    acceptance: earningsData.performance?.acceptanceRate || 85,
                    completion: earningsData.performance?.completionRate || 95,
                    onlineHours: 0 // Will be updated separately
                })

                console.log('Earnings analytics loaded successfully:', earningsData)
                
                // Show success notification
                addNotification('Earnings data updated successfully', 'success')
            } else {
                throw new Error('Failed to load earnings data after multiple attempts')
            }
            
        } catch (error) {
            console.error('Error fetching earnings analytics:', error)
            
            // Provide fallback data for better UX
            setEarnings({
                today: { totalEarnings: 0, totalRides: 0 },
                week: { totalEarnings: 0, totalRides: 0 },
                month: { totalEarnings: 0, totalRides: 0 },
                total: 0
            })
            
            setStats({
                rides: 0,
                rating: 4.8,
                acceptance: 85,
                completion: 95,
                onlineHours: 0
            })
            
            setError('Unable to load latest earnings. Showing cached data.')
            addNotification('Could not load earnings data', 'warning')
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
            console.log('🎉 Earnings updated:', data)
            
            // Update earnings display with animation effect
            setEarnings(prev => ({
                ...prev,
                today: {
                    totalEarnings: (prev.today.totalEarnings || 0) + (data.earnings?.totalEarnings || 0),
                    totalRides: (prev.today.totalRides || 0) + 1
                },
                total: (prev.total || 0) + (data.earnings?.totalEarnings || 0)
            }))

            setStats(prev => ({
                ...prev,
                rides: (prev.rides || 0) + 1,
                rating: data.updatedStats?.rating || prev.rating,
                acceptance: data.updatedStats?.acceptanceRate || prev.acceptance,
                completion: data.updatedStats?.completionRate || prev.completion
            }))

            // Show enhanced earnings notification with details
            const earningsAmount = data.earnings?.totalEarnings || 0
            const bonus = data.earnings?.bonus || 0
            const commission = data.earnings?.commission || 0
            
            let message = `🎉 Ride Completed!\n💰 Earned: ₹${earningsAmount}`
            if (bonus > 0) message += `\n🎁 Bonus: ₹${bonus}`
            if (commission > 0) message += `\n💼 Commission: ₹${commission}`
            
            addNotification(message, 'success')
            
            // Also refresh analytics to get latest data
            setTimeout(() => fetchAnalytics(), 2000)
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
        setShowOtpModal(true)
    }

    // Handle OTP verification
    const handleOtpVerification = async () => {
        if (!otpInput.trim() || otpInput.length !== 6) {
            addNotification('Please enter a valid 6-digit OTP', 'error')
            return
        }
        
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/start-ride?rideId=${currentRide._id}&otp=${otpInput}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            
            socket.emit('trip-status-update', {
                rideId: currentRide._id,
                status: 'started',
                message: 'Trip has started'
            })
            
            addNotification('Trip started successfully!', 'success')
            
            // Reset OTP modal
            setShowOtpModal(false)
            setOtpInput('')
            
        } catch (error) {
            console.error('Error starting trip:', error)
            addNotification('Invalid OTP. Please check and try again.', 'error')
        }
    }

    // End the trip with earnings calculation
    const endTrip = async () => {
        if (!currentRide) return
        
        if (!confirm('Are you sure you want to end this trip?')) return
        
        try {
            setLoading(true)
            
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/end-ride`, {
                rideId: currentRide._id
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                timeout: 15000
            })
            
            // Notify user via socket
            socket.emit('trip-status-update', {
                rideId: currentRide._id,
                status: 'ended',
                message: 'Trip has been completed'
            })
            
            // Show earnings summary if available
            if (response.data?.earnings) {
                const earnings = response.data.earnings
                addNotification(
                    `Trip completed! Earned ₹${earnings.totalEarnings}${earnings.bonus > 0 ? ` (includes ₹${earnings.bonus} bonus)` : ''}`,
                    'success'
                )
            } else {
                addNotification('Trip completed successfully!', 'success')
            }
            
            setCurrentRide(null)
            setMessages([])
            
            // Refresh earnings data after trip completion
            setTimeout(() => {
                fetchAnalytics()
                fetchDailyStats()
            }, 1000)
            
        } catch (error) {
            console.error('Error ending trip:', error)
            addNotification(`Error ending trip: ${error.response?.data?.message || 'Please try again'}`, 'error')
        } finally {
            setLoading(false)
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

    // Notification system
    const addNotification = (message, type = 'info', duration = 5000) => {
        const id = Date.now()
        const notification = { id, message, type, timestamp: new Date() }
        
        setNotifications(prev => [...prev, notification])
        
        // Auto remove after duration
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
        }, duration)
    }

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }


    return (
        <div className='h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50'>
            {/* Enhanced Notifications */}
            {notifications.length > 0 && (
                <div className='absolute top-4 right-4 z-50 space-y-2 max-w-xs'>
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`p-4 rounded-xl shadow-xl transform transition-all duration-300 backdrop-blur-sm ${
                                notification.type === 'error' ? 'bg-red-500 text-white border-2 border-red-300' :
                                notification.type === 'success' ? 'bg-green-500 text-white border-2 border-green-300' :
                                notification.type === 'warning' ? 'bg-yellow-500 text-black border-2 border-yellow-300' :
                                'bg-blue-500 text-white border-2 border-blue-300'
                            }`}
                        >
                            <div className='flex items-start justify-between'>
                                <div className='flex items-start space-x-3'>
                                    <div className={`p-1 rounded-full ${
                                        notification.type === 'error' ? 'bg-red-600' :
                                        notification.type === 'success' ? 'bg-green-600' :
                                        notification.type === 'warning' ? 'bg-yellow-600' :
                                        'bg-blue-600'
                                    }`}>
                                        <i className={`text-sm ${
                                            notification.type === 'error' ? 'ri-error-warning-line' :
                                            notification.type === 'success' ? 'ri-check-line' :
                                            notification.type === 'warning' ? 'ri-alert-line' :
                                            'ri-information-line'
                                        }`}></i>
                                    </div>
                                    <div className='flex-1'>
                                        <span className='text-sm font-medium block whitespace-pre-line'>{notification.message}</span>
                                        <span className='text-xs opacity-75 mt-1 block'>
                                            {notification.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeNotification(notification.id)}
                                    className='ml-2 p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors'
                                >
                                    <i className="ri-close-line text-sm"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className='absolute inset-0 z-40 bg-black bg-opacity-30 flex items-center justify-center'>
                    <div className='bg-white p-6 rounded-xl shadow-xl flex items-center space-x-3'>
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500"></div>
                        <span className='text-gray-700 font-medium'>Processing...</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className='absolute top-0 left-0 right-0 z-30 bg-white shadow-lg backdrop-blur-sm bg-opacity-95'>
                <div className='flex items-center justify-between p-4'>
                    <div className='flex items-center gap-3'>
                        <div className='relative'>
                            <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg'>
                                QR
                            </div>
                            {isOnline && (
                                <div className='absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse'></div>
                            )}
                        </div>
                        <div>
                            <h1 className='font-bold text-lg text-gray-800'>Quick Ride Captain</h1>
                            <div className='flex items-center gap-3 text-sm'>
                                <span className='text-gray-600'>
                                    {captain?.fullname?.firstname} • {captain?.city}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                    isOnline 
                                        ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 shadow-md' 
                                        : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
                                }`}>
                                    <div className='flex items-center gap-2'>
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                        {isOnline ? 'Online' : 'Offline'}
                                    </div>
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className='flex items-center gap-3'>
                        {/* Online/Offline Toggle */}
                        <button
                            onClick={toggleOnlineStatus}
                            disabled={loading}
                            className={`px-5 py-2 rounded-xl font-medium text-sm transition-all shadow-lg transform hover:scale-105 ${
                                isOnline 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-200' 
                                    : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 shadow-gray-200'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className='flex items-center gap-2'>
                                {loading ? (
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                ) : (
                                    <i className={`${isOnline ? 'ri-radio-button-line' : 'ri-stop-circle-line'}`}></i>
                                )}
                                {isOnline ? 'Online' : 'Go Online'}
                            </div>
                        </button>
                        
                        {/* Earnings Summary */}
                        <div className='px-3 py-2 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-xl shadow-md'>
                            <div className='text-xs text-yellow-700 font-medium'>Today</div>
                            <div className='text-sm font-bold text-yellow-800'>₹{earnings.today.totalEarnings || 0}</div>
                        </div>

                        {/* Debug Button (hidden in production) */}
                        <button 
                            onClick={debugAuth}
                            className='px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors'
                        >
                            Debug
                        </button>

                        {/* Logout */}
                        <button 
                            onClick={handleLogout}
                            className='p-2 bg-gradient-to-r from-red-50 to-red-100 text-red-600 rounded-xl hover:from-red-100 hover:to-red-200 transition-all shadow-md'
                            title="Logout"
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
                {/* Enhanced Stats Overview with Animations */}
                <div className='grid grid-cols-2 gap-4 mb-4'>
                    <div className='p-4 bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-transform'>
                        <div className='flex items-center justify-between mb-3'>
                            <div className='p-2 bg-white bg-opacity-20 rounded-xl'>
                                <i className="ri-money-dollar-circle-line text-2xl"></i>
                            </div>
                            <span className='text-xs font-medium opacity-90 bg-white bg-opacity-20 px-2 py-1 rounded-full'>TODAY</span>
                        </div>
                        <div className='text-3xl font-bold mb-1'>₹{earnings.today.totalEarnings || 0}</div>
                        <div className='text-sm opacity-90'>
                            <div className='flex items-center gap-2'>
                                <span>{earnings.today.totalRides || 0} rides</span>
                                <span>•</span>
                                <span>₹{earnings.today.totalRides > 0 ? Math.round(earnings.today.totalEarnings / earnings.today.totalRides) : 0} avg</span>
                            </div>
                        </div>
                        <div className='mt-2 text-xs opacity-75'>
                            {earnings.today.totalRides > 0 ? '+' + Math.round((earnings.today.totalEarnings / earnings.today.totalRides) * 0.15) : '0'} commission saved
                        </div>
                    </div>
                    
                    <div className='p-4 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-transform'>
                        <div className='flex items-center justify-between mb-3'>
                            <div className='p-2 bg-white bg-opacity-20 rounded-xl'>
                                <i className="ri-car-line text-2xl"></i>
                            </div>
                            <span className='text-xs font-medium opacity-90 bg-white bg-opacity-20 px-2 py-1 rounded-full'>LIFETIME</span>
                        </div>
                        <div className='text-3xl font-bold mb-1'>{stats.rides}</div>
                        <div className='text-sm opacity-90'>
                            <div className='flex items-center gap-2'>
                                <span>₹{earnings.total} earned</span>
                            </div>
                        </div>
                        <div className='mt-2 text-xs opacity-75'>
                            ₹{stats.rides > 0 ? Math.round(earnings.total / stats.rides) : 0} per ride average
                        </div>
                    </div>
                </div>

                {/* Weekly and Monthly Stats */}
                <div className='grid grid-cols-2 gap-4 mb-4'>
                    <div className='p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl border border-purple-300 shadow-md'>
                        <div className='flex items-center justify-between mb-2'>
                            <div className='p-2 bg-purple-500 text-white rounded-lg'>
                                <i className="ri-calendar-week-line text-lg"></i>
                            </div>
                            <span className='text-xs text-purple-700 font-bold bg-purple-200 px-2 py-1 rounded-full'>WEEK</span>
                        </div>
                        <div className='text-xl font-bold text-purple-800 mb-1'>₹{earnings.week.totalEarnings || 0}</div>
                        <div className='text-sm text-purple-600'>
                            {earnings.week.totalRides || 0} rides
                            {earnings.week.totalRides > 0 && (
                                <span className='ml-2'>• ₹{Math.round(earnings.week.totalEarnings / earnings.week.totalRides)} avg</span>
                            )}
                        </div>
                    </div>
                    
                    <div className='p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl border border-orange-300 shadow-md'>
                        <div className='flex items-center justify-between mb-2'>
                            <div className='p-2 bg-orange-500 text-white rounded-lg'>
                                <i className="ri-calendar-line text-lg"></i>
                            </div>
                            <span className='text-xs text-orange-700 font-bold bg-orange-200 px-2 py-1 rounded-full'>MONTH</span>
                        </div>
                        <div className='text-xl font-bold text-orange-800 mb-1'>₹{earnings.month.totalEarnings || 0}</div>
                        <div className='text-sm text-orange-600'>
                            {earnings.month.totalRides || 0} rides
                            {earnings.month.totalRides > 0 && (
                                <span className='ml-2'>• ₹{Math.round(earnings.month.totalEarnings / earnings.month.totalRides)} avg</span>
                            )}
                        </div>
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

                {/* Enhanced Status Message */}
                <div className='text-center py-4'>
                    {!isOnline ? (
                        <div className='bg-gray-100 rounded-xl p-4 border-2 border-dashed border-gray-300'>
                            <div className='flex items-center justify-center gap-3 text-gray-600 mb-2'>
                                <i className="ri-pause-circle-line text-2xl"></i>
                                <span className='font-medium'>You're offline</span>
                            </div>
                            <p className='text-sm text-gray-500'>Turn online to start receiving ride requests and earning money</p>
                        </div>
                    ) : !incomingRide && !currentRide ? (
                        <div className='bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border-2 border-dashed border-green-300'>
                            <div className='flex items-center justify-center gap-3 text-green-700 mb-2'>
                                <div className="relative">
                                    <div className="animate-ping w-4 h-4 bg-green-500 rounded-full absolute"></div>
                                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                </div>
                                <span className='font-medium'>Ready for rides!</span>
                            </div>
                            <p className='text-sm text-green-600'>You're online and available to accept ride requests</p>
                            <div className='mt-2 text-xs text-green-500'>
                                Rides will appear automatically when passengers book in your area
                            </div>
                        </div>
                    ) : currentRide ? (
                        <div className='bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-300'>
                            <div className='flex items-center justify-center gap-3 text-blue-700 mb-2'>
                                <i className="ri-car-line text-2xl"></i>
                                <span className='font-medium'>Trip in Progress</span>
                            </div>
                            <p className='text-sm text-blue-600'>Complete your current ride to accept new requests</p>
                        </div>
                    ) : null}
                </div>

                {/* Quick Actions */}
                {isOnline && !currentRide && (
                    <div className='grid grid-cols-2 gap-3 mt-4'>
                        <button 
                            onClick={() => fetchAnalytics()}
                            className='flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors'
                        >
                            <i className="ri-refresh-line"></i>
                            <span>Refresh</span>
                        </button>
                        
                        <button 
                            onClick={() => addNotification('Feature coming soon!', 'info')}
                            className='flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors'
                        >
                            <i className="ri-history-line"></i>
                            <span>History</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Enhanced Incoming Ride Request Modal */}
            {incomingRide && (
                <div className='absolute inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm'>
                    <div className='bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-4 border-green-400 transform'>
                        <div className='text-center mb-6'>
                            <div className='relative mb-4'>
                                <div className='w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg'>
                                    <i className="ri-notification-line text-3xl text-white animate-pulse"></i>
                                </div>
                                <div className='absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-ping'>
                                    NEW
                                </div>
                            </div>
                            <h2 className='text-2xl font-bold mb-2 text-gray-800'>🚗 Ride Request!</h2>
                            <div className='bg-gradient-to-r from-green-400 to-blue-400 h-1 rounded-full mx-8 mb-4'></div>
                            <div className='bg-green-50 rounded-xl p-3 mb-4'>
                                <div className='text-lg font-bold text-green-800'>
                                    ₹{incomingRide.estimatedFare || incomingRide.fare || 'Calculating...'}
                                </div>
                                <div className='text-sm text-green-600'>
                                    {incomingRide.distance || '5.2'} km • {incomingRide.duration || '15'} mins
                                </div>
                            </div>
                        </div>

                        <div className='space-y-4 mb-6'>
                            <div className='bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border-l-4 border-green-500'>
                                <div className='flex items-start gap-3'>
                                    <div className='w-4 h-4 bg-green-500 rounded-full mt-1 animate-pulse'></div>
                                    <div className='flex-1'>
                                        <p className='font-bold text-green-800 flex items-center gap-2'>
                                            <i className="ri-map-pin-line"></i>
                                            Pickup Location
                                        </p>
                                        <p className='text-sm text-green-700 mt-1 break-words'>{incomingRide.pickup}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className='bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 border-l-4 border-red-500'>
                                <div className='flex items-start gap-3'>
                                    <div className='w-4 h-4 bg-red-500 rounded-full mt-1'></div>
                                    <div className='flex-1'>
                                        <p className='font-bold text-red-800 flex items-center gap-2'>
                                            <i className="ri-map-pin-line"></i>
                                            Destination
                                        </p>
                                        <p className='text-sm text-red-700 mt-1 break-words'>{incomingRide.destination}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className='bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-3'>
                                        <div className='p-2 bg-blue-500 rounded-lg'>
                                            <i className="ri-car-line text-white text-lg"></i>
                                        </div>
                                        <div>
                                            <p className='font-bold text-blue-800 capitalize'>{incomingRide.vehicleType}</p>
                                            <p className='text-sm text-blue-600'>
                                                {incomingRide.userInfo?.name || 'User'} • {incomingRide.userInfo?.phone || 'Phone not available'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex gap-4'>
                            <button
                                onClick={rejectRideRequest}
                                className='flex-1 py-4 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 rounded-xl font-bold hover:from-gray-300 hover:to-gray-400 transition-all transform hover:scale-105 shadow-lg'
                            >
                                <div className='flex items-center justify-center gap-2'>
                                    <i className="ri-close-line text-lg"></i>
                                    Decline
                                </div>
                            </button>
                            <button
                                onClick={acceptRideRequest}
                                className='flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg'
                            >
                                <div className='flex items-center justify-center gap-2'>
                                    <i className="ri-check-line text-lg"></i>
                                    Accept Ride
                                </div>
                            </button>
                        </div>
                        
                        {/* Auto-reject timer */}
                        <div className='mt-4 text-center'>
                            <div className='text-xs text-gray-500'>
                                Request will auto-decline in 30 seconds
                            </div>
                            <div className='mt-2 w-full bg-gray-200 rounded-full h-1'>
                                <div className='bg-red-500 h-1 rounded-full animate-pulse' style={{width: '100%'}}></div>
                            </div>
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

            {/* OTP Verification Modal */}
        {showOtpModal && (
            <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
                <div className='bg-white rounded-2xl p-6 w-full max-w-sm'>
                    <div className='text-center'>
                        <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                            <svg className='w-8 h-8 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                            </svg>
                        </div>
                        
                        <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                            Enter OTP
                        </h3>
                        
                        <p className='text-gray-600 mb-6'>
                            Ask the passenger for their 6-digit OTP to start the trip
                        </p>
                        
                        <div className='mb-6'>
                            <input
                                type='text'
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder='Enter 6-digit OTP'
                                maxLength='6'
                                className='w-full p-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500'
                                autoFocus
                            />
                        </div>
                        
                        <div className='flex gap-3'>
                            <button
                                onClick={() => {
                                    setShowOtpModal(false)
                                    setOtpInput('')
                                }}
                                className='flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50'
                            >
                                Cancel
                            </button>
                            
                            <button
                                onClick={handleOtpVerification}
                                disabled={otpInput.length !== 6}
                                className='flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
                            >
                                Start Trip
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