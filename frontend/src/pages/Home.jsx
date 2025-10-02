import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios';
import 'remixicon/fonts/remixicon.css'
import { SocketContext } from '../context/SocketContext';
import { UserDataContext } from '../context/UserContext';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers
const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Map click handler component
function MapClickHandler({ onMapClick, selectionMode }) {
    useMapEvents({
        click: async (e) => {
            if (selectionMode && onMapClick) {
                const { lat, lng } = e.latlng;
                
                try {
                    // Get address from coordinates
                    const response = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                        {
                            headers: { 'User-Agent': 'quick-ride-app' }
                        }
                    );
                    
                    const address = response.data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    
                    onMapClick({
                        lat,
                        lng,
                        address,
                        type: selectionMode
                    });
                } catch (error) {
                    console.error('Error getting address:', error);
                    onMapClick({
                        lat,
                        lng,
                        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        type: selectionMode
                    });
                }
            }
        }
    });
    
    return null;
}

const Home = () => {
    // Base vehicle types with pricing structure
    const baseVehicleTypes = [
        { id: 'moto', name: 'Moto', icon: '🏍️', baseFare: 30, perKm: 8, description: 'Quick & affordable' },
        { id: 'auto', name: 'Auto', icon: '🛺', baseFare: 50, perKm: 12, description: 'Comfortable ride' },
        { id: 'car', name: 'Car', icon: '🚗', baseFare: 70, perKm: 15, description: 'Premium experience' }
    ]

    // Simplified state
    const [pickupLocation, setPickupLocation] = useState(null)
    const [destinationLocation, setDestinationLocation] = useState(null)
    const [currentLocation, setCurrentLocation] = useState([28.6139, 77.2090])
    const [selectionMode, setSelectionMode] = useState('pickup') // 'pickup' or 'destination'
    const [rideStep, setRideStep] = useState('selecting') // 'selecting', 'drivers', 'booking', 'waiting', 'accepted', 'driver-arriving', 'trip-started', 'chatting', 'completed'
    const [ride, setRide] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [selectedVehicle, setSelectedVehicle] = useState('car') // Default to 'car'
    const [selectedCity, setSelectedCity] = useState('')
    const [availableDrivers, setAvailableDrivers] = useState([])
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [loadingDrivers, setLoadingDrivers] = useState(false)
    const [distance, setDistance] = useState(0)
    const [duration, setDuration] = useState(0)
    const [otpResendCooldown, setOtpResendCooldown] = useState(0)
    const [vehicleTypesWithPricing, setVehicleTypesWithPricing] = useState(baseVehicleTypes)
    const [driverCounts, setDriverCounts] = useState({ moto: 0, auto: 0, car: 0 })
    
    // Enhanced state management
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [locationPermission, setLocationPermission] = useState('pending') // 'pending', 'granted', 'denied'
    const [networkStatus, setNetworkStatus] = useState('online')
    const [estimatedFare, setEstimatedFare] = useState(null)
    const [eta, setEta] = useState(null)
    const [bookingTimeout, setBookingTimeout] = useState(null)
    const [notifications, setNotifications] = useState([])
    const [showOfflineMode, setShowOfflineMode] = useState(false)

    const { socket } = useContext(SocketContext)
    const { user } = useContext(UserDataContext)

    // Popular cities (you can expand this list)
    const cities = [
        'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
        'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur'
    ]

    // Enhanced geolocation handling
    useEffect(() => {
        const getCurrentLocation = () => {
            if (!navigator.geolocation) {
                setLocationPermission('denied')
                setError('Geolocation is not supported by this browser')
                return
            }

            setLoading(true)
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords
                    setCurrentLocation([latitude, longitude])
                    setLocationPermission('granted')
                    setLoading(false)
                },
                (error) => {
                    setLocationPermission('denied')
                    setLoading(false)
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            setError('Location access denied. Please enable location services.')
                            break
                        case error.POSITION_UNAVAILABLE:
                            setError('Location information is unavailable.')
                            break
                        case error.TIMEOUT:
                            setError('Location request timed out.')
                            break
                        default:
                            setError('An unknown error occurred while retrieving location.')
                            break
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            )
        }

        getCurrentLocation()

        // Watch network status
        const handleOnline = () => setNetworkStatus('online')
        const handleOffline = () => setNetworkStatus('offline')
        
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Socket setup
    useEffect(() => {
        if (user && socket) {
            socket.emit("join", { userType: "user", userId: user._id })
            
            // Listen for ride confirmation
            socket.on('ride-confirmed', (rideData) => {
                console.log('Ride confirmed with data:', rideData)
                setRide(rideData)
                setRideStep('accepted')
                // Show success notification when OTP is available
                if (rideData?.otp) {
                    handleSuccess(`🎉 Driver Accepted! Your OTP: ${rideData.otp} - Share with driver to start trip!`)
                    
                    // Optional: Add a brief flash effect or sound notification here
                    // You could also scroll to show the OTP section
                    setTimeout(() => {
                        const otpSection = document.querySelector('.otp-display')
                        if (otpSection) {
                            otpSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                    }, 500)
                }
            })
            
            // Listen for ride rejection
            socket.on('ride-rejected', (data) => {
                alert('Driver declined your ride request. Please try selecting another driver.')
                setRideStep('drivers')
                setRide(null)
                setSelectedDriver(null)
            })
            
            // Listen for driver arriving
            socket.on('driver-arriving', (data) => {
                setRideStep('driver-arriving')
                // Could show estimated arrival time
            })
            
            // Listen for driver arrived
            socket.on('driver-arrived', (data) => {
                alert('Your driver has arrived!')
                setRideStep('driver-arriving')
            })
            
            // Listen for trip started
            socket.on('trip-started', (data) => {
                setRideStep('trip-started')
                alert('Trip started! Enjoy your ride.')
            })
            
            // Listen for trip ended by driver
            socket.on('trip-ended', (data) => {
                console.log('Trip ended by driver:', data)
                setRideStep('completed')
                const fareAmount = ride?.fare || ride?.estimatedFare || 'N/A'
                handleSuccess(`🎉 Trip completed! Total fare: ₹${fareAmount}. Thank you for riding with us!`)
            })
            
            // Listen for messages
            socket.on('message', (message) => {
                setMessages(prev => [...prev, message])
            })

            return () => {
                socket.off('ride-confirmed')
                socket.off('ride-rejected')
                socket.off('driver-arriving')
                socket.off('driver-arrived')
                socket.off('trip-started')
                socket.off('trip-ended')
                socket.off('message')
            }
        }
    }, [user, socket])

    // Get driver counts when city is selected
    useEffect(() => {
        if (selectedCity) {
            getDriverCounts()
        }
    }, [selectedCity])

    // Calculate distance whenever both locations change
    useEffect(() => {
        if (pickupLocation && destinationLocation) {
            console.log('Locations changed, calculating distance...')
            calculateDistanceAndFare()
        }
    }, [pickupLocation, destinationLocation])

    // Extract city from address
    const extractCityFromAddress = (address) => {
        // Simple city extraction - you can make this more sophisticated
        const parts = address.split(',')
        for (let part of parts) {
            const trimmed = part.trim()
            // Check if this part matches our city list
            const matchedCity = cities.find(city => 
                trimmed.toLowerCase().includes(city.toLowerCase()) ||
                city.toLowerCase().includes(trimmed.toLowerCase())
            )
            if (matchedCity) return matchedCity
        }
        return null
    }

    // Handle map clicks
    const handleMapClick = async (locationData) => {
        if (locationData.type === 'pickup') {
            setPickupLocation(locationData)
            
            // Auto-detect city from pickup location
            const detectedCity = extractCityFromAddress(locationData.address)
            if (detectedCity && !selectedCity) {
                setSelectedCity(detectedCity)
            }
            
            // If destination already exists, calculate distance
            if (destinationLocation) {
                setTimeout(() => calculateDistanceAndFare(), 100)
            }
        } else if (locationData.type === 'destination') {
            setDestinationLocation(locationData)
            
            // Verify both locations are in the same city
            if (pickupLocation) {
                const pickupCity = extractCityFromAddress(pickupLocation.address)
                const destCity = extractCityFromAddress(locationData.address)
                
                if (pickupCity && destCity && pickupCity !== destCity) {
                    alert(`Both pickup and destination should be in the same city. Pickup: ${pickupCity}, Destination: ${destCity}`)
                    setDestinationLocation(null)
                    return
                }
            }
            
            // Calculate distance and update pricing when both locations are set
            if (pickupLocation) {
                setTimeout(() => calculateDistanceAndFare(), 100)
            }
        }
    }

    // Calculate distance between pickup and destination
    const calculateDistanceAndFare = async () => {
        if (!pickupLocation || !destinationLocation) {
            console.log('Missing locations for distance calculation:', { pickupLocation, destinationLocation })
            return
        }

        // Validate lat/lng exist
        if (!pickupLocation.lat || !pickupLocation.lng || !destinationLocation.lat || !destinationLocation.lng) {
            console.log('Invalid location coordinates:', { 
                pickup: { lat: pickupLocation.lat, lng: pickupLocation.lng },
                destination: { lat: destinationLocation.lat, lng: destinationLocation.lng }
            })
            return
        }

        try {
            console.log('Calculating distance between:', 
                `Pickup: ${pickupLocation.lat}, ${pickupLocation.lng}`, 
                `Destination: ${destinationLocation.lat}, ${destinationLocation.lng}`
            )
            
            // Haversine formula to calculate distance
            const R = 6371 // Earth's radius in kilometers
            const lat1 = parseFloat(pickupLocation.lat)
            const lon1 = parseFloat(pickupLocation.lng)
            const lat2 = parseFloat(destinationLocation.lat)
            const lon2 = parseFloat(destinationLocation.lng)
            
            const dLat = (lat2 - lat1) * Math.PI / 180
            const dLon = (lon2 - lon1) * Math.PI / 180
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            const calculatedDistance = R * c

            console.log('Calculated distance:', calculatedDistance.toFixed(2), 'km')

            // Minimum distance validation
            const validatedDistance = Math.max(0.1, calculatedDistance) // Minimum 100 meters
            setDistance(validatedDistance)
            
            // Enhanced duration calculation with traffic consideration
            const timeOfDay = new Date().getHours()
            const isRushHour = (timeOfDay >= 8 && timeOfDay <= 10) || (timeOfDay >= 17 && timeOfDay <= 20)
            const trafficMultiplier = isRushHour ? 1.8 : 1.2
            const baseDuration = validatedDistance * 2.5 // 2.5 minutes per km base
            const estimatedDuration = Math.round(baseDuration * trafficMultiplier)
            setDuration(estimatedDuration)

            // Dynamic pricing based on time and demand
            const surgePricing = isRushHour ? 1.5 : 1.0
            const dayOfWeek = new Date().getDay()
            const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0

            // Update vehicle types with enhanced pricing
            const updatedVehicleTypes = baseVehicleTypes.map(vehicle => {
                const baseFare = vehicle.baseFare * surgePricing * weekendMultiplier
                const distanceFare = validatedDistance * vehicle.perKm * surgePricing
                const totalFare = Math.round(Math.max(vehicle.baseFare, baseFare + distanceFare))
                
                return {
                    ...vehicle,
                    price: totalFare,
                    originalPrice: Math.round(vehicle.baseFare + (validatedDistance * vehicle.perKm)),
                    surge: surgePricing > 1,
                    surgeMultiplier: surgePricing,
                    estimatedTime: estimatedDuration
                }
            })
            
            setVehicleTypesWithPricing(updatedVehicleTypes)
            setEstimatedFare(updatedVehicleTypes.find(v => v.id === selectedVehicle)?.price)

            console.log('Updated vehicle types with enhanced pricing:', updatedVehicleTypes)

        } catch (error) {
            console.error('Error calculating distance:', error)
        }
    }

    // Enhanced driver search with caching and retries
    const getDriverCounts = async (retryCount = 0) => {
        if (!selectedCity) return

        try {
            setLoading(true)
            const counts = { moto: 0, auto: 0, car: 0 }
            const promises = []
            
            for (const vehicleType of ['moto', 'auto', 'car']) {
                const promise = axios.get(`${import.meta.env.VITE_BASE_URL}/captains/available?city=${selectedCity}&vehicleType=${vehicleType}`, {
                    timeout: 5000,
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                }).then(response => {
                    counts[vehicleType] = response.data.drivers.length
                }).catch(err => {
                    console.warn(`Error fetching ${vehicleType} drivers:`, err)
                    counts[vehicleType] = 0
                })
                promises.push(promise)
            }
            
            await Promise.all(promises)
            setDriverCounts(counts)
            setError(null)
            
        } catch (error) {
            console.error('Error fetching driver counts:', error)
            
            // Retry logic for network errors
            if (retryCount < 2 && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')) {
                console.log(`Retrying driver counts fetch... Attempt ${retryCount + 1}`)
                setTimeout(() => getDriverCounts(retryCount + 1), 1000)
                return
            }
            
            setError('Unable to fetch available drivers. Please check your connection.')
        } finally {
            setLoading(false)
        }
    }

    // Fetch available drivers
    const handleSelectDrivers = async () => {
        if (!selectedCity || !pickupLocation || !destinationLocation) return
        
        setLoadingDrivers(true)
        setRideStep('drivers')
        
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/captains/available?city=${selectedCity}&vehicleType=${selectedVehicle}`)
            setAvailableDrivers(response.data.drivers)
        } catch (error) {
            console.error('Error fetching drivers:', error)
            alert('Failed to fetch drivers. Please try again.')
            setRideStep('selecting')
        } finally {
            setLoadingDrivers(false)
        }
    }

    // Book ride with specific driver
    const handleBookRideWithDriver = async (driver) => {
        // Validate all required data
        if (!pickupLocation || !destinationLocation) {
            alert('Please select both pickup and destination locations')
            return
        }
        
        if (!driver) {
            alert('Please select a driver')
            return
        }
        
        if (!selectedCity) {
            alert('City is required for booking')
            return
        }
        
        if (distance <= 0) {
            alert('Invalid distance calculation. Please reselect locations.')
            return
        }
        
        setSelectedDriver(driver)
        setRideStep('booking')
        setLoading(true)
        setError(null)
        
        try {
            // Set booking timeout
            const timeout = setTimeout(() => {
                setError('Booking is taking longer than expected. Please try again.')
                setRideStep('drivers')
                setSelectedDriver(null)
            }, 30000) // 30 seconds timeout
            
            setBookingTimeout(timeout)

            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
                pickup: pickupLocation.address,
                destination: destinationLocation.address,
                vehicleType: selectedVehicle,
                city: selectedCity,
                captainId: driver._id,
                userId: user?._id || '6743423c24a4b94d8bee6411', // Temporary test user ID
                distance: distance.toFixed(2),
                estimatedFare: estimatedFare,
                estimatedDuration: duration
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                timeout: 15000 // 15 seconds API timeout
            })
            
            clearTimeout(timeout)
            setBookingTimeout(null)
            
            if (!response.data || !response.data._id) {
                throw new Error('Invalid response from server')
            }
            
            setRide(response.data)
            
            // Enhanced ride request with more details
            socket.emit('ride-request', {
                rideId: response.data._id,
                captainId: driver._id,
                pickup: pickupLocation.address,
                destination: destinationLocation.address,
                vehicleType: selectedVehicle,
                estimatedFare: estimatedFare,
                distance: distance.toFixed(2),
                duration: duration,
                userInfo: {
                    name: user?.fullname?.firstname || 'User',
                    phone: user?.phone || 'N/A'
                }
            })
            
            // Set waiting timeout
            const waitingTimeout = setTimeout(() => {
                if (rideStep === 'waiting') {
                    setError('Driver response timeout. Please try another driver.')
                    setRideStep('drivers')
                    setSelectedDriver(null)
                    setRide(null)
                }
            }, 60000) // 60 seconds for driver response
            
            setRideStep('waiting')
            
        } catch (error) {
            console.error('Error booking ride:', error)
            
            // Clear any timeouts
            if (bookingTimeout) {
                clearTimeout(bookingTimeout)
                setBookingTimeout(null)
            }
            
            // Enhanced error messages based on error type
            let errorMessage = 'Failed to book ride. Please try again.'
            
            if (error.response) {
                switch (error.response.status) {
                    case 400:
                        errorMessage = 'Invalid booking details. Please check your information.'
                        break
                    case 401:
                        errorMessage = 'Authentication required. Please login again.'
                        break
                    case 404:
                        errorMessage = 'Driver not found. Please select another driver.'
                        break
                    case 500:
                        errorMessage = 'Server error. Please try again later.'
                        break
                    default:
                        errorMessage = `Booking failed: ${error.response.data?.message || 'Unknown error'}`
                }
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout. Please check your connection and try again.'
            } else if (error.message.includes('Network')) {
                errorMessage = 'Network error. Please check your internet connection.'
            }
            
            setError(errorMessage)
            setRideStep('drivers')
            setSelectedDriver(null)
            setRide(null)
        } finally {
            setLoading(false)
        }
        
        // Set a timeout for booking confirmation
        setTimeout(() => {
            if (rideStep === 'booking') {
                alert('No response from driver. Please try selecting another driver.')
                setRideStep('drivers')
                setSelectedDriver(null)
                setRide(null)
            }
        }, 30000) // 30 seconds timeout
    }

    // Send message
    const handleSendMessage = () => {
        if (!newMessage.trim() || !ride) return
        
        const message = {
            text: newMessage,
            sender: 'user',
            timestamp: new Date().toISOString()
        }
        
        socket.emit('message', { rideId: ride._id, message })
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

    // Enhanced error handler
    const handleError = (error, context = '') => {
        console.error(`Error in ${context}:`, error)
        
        let message = 'Something went wrong. Please try again.'
        if (error.message) {
            message = error.message
        } else if (error.response?.data?.message) {
            message = error.response.data.message
        }
        
        addNotification(message, 'error')
        setError(message)
    }

    // Success handler
    const handleSuccess = (message) => {
        addNotification(message, 'success')
        setError(null)
    }

    // Complete ride
    const handleCompleteRide = async () => {
        if (!ride) return
        
        try {
            // Notify driver via socket
            socket.emit('ride-ended-by-user', {
                rideId: ride._id,
                captainId: ride.captain,
                message: 'User has ended the ride'
            })
            
            // Set UI state
            setRideStep('completed')
            
            console.log('Ride completed by user')
        } catch (error) {
            console.error('Error completing ride:', error)
        }
    }

    // Resend OTP
    const handleResendOtp = async () => {
        if (!ride?._id || otpResendCooldown > 0) return
        
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/resend-otp`, {
                rideId: ride._id
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            
            // Update ride with new OTP
            setRide(prev => ({ ...prev, otp: response.data.otp }))
            handleSuccess('New OTP sent successfully!')
            
            // Set cooldown for 30 seconds
            setOtpResendCooldown(30)
            const interval = setInterval(() => {
                setOtpResendCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            
        } catch (error) {
            console.error('Error resending OTP:', error)
            handleError('Failed to resend OTP. Please try again.')
        }
    }

    // Reset to initial state
    const resetRide = () => {
        setPickupLocation(null)
        setDestinationLocation(null)
        setRide(null)
        setMessages([])
        setRideStep('selecting')
        setSelectionMode('pickup')
        setSelectedVehicle('car')
        setSelectedCity('')
        setAvailableDrivers([])
        setSelectedDriver(null)
        setDistance(0)
        setDuration(0)
        setVehicleTypesWithPricing(baseVehicleTypes)
        setDriverCounts({ moto: 0, auto: 0, car: 0 })
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
                                        <span className='text-sm font-medium block'>{notification.message}</span>
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

            {/* Network Status */}
            {networkStatus === 'offline' && (
                <div className='absolute top-4 left-4 right-4 z-50 bg-red-500 text-white p-3 rounded-lg shadow-lg'>
                    <div className='flex items-center justify-center space-x-2'>
                        <i className="ri-wifi-off-line"></i>
                        <span className='font-medium'>You are offline. Some features may not work.</span>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className='absolute inset-0 z-40 bg-black bg-opacity-30 flex items-center justify-center'>
                    <div className='bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3'>
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500"></div>
                        <span className='text-gray-700 font-medium'>Loading...</span>
                    </div>
                </div>
            )}

            {/* Map */}
            <div className='absolute inset-0 z-0'>
                <MapContainer 
                    center={currentLocation} 
                    zoom={13}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <MapClickHandler 
                        onMapClick={handleMapClick} 
                        selectionMode={selectionMode} 
                    />

                    {/* Pickup marker */}
                    {pickupLocation && (
                        <Marker 
                            position={[pickupLocation.lat, pickupLocation.lng]} 
                            icon={pickupIcon}
                        >
                            <Popup>
                                <strong>Pickup:</strong><br />
                                {pickupLocation.address}
                            </Popup>
                        </Marker>
                    )}

                    {/* Destination marker */}
                    {destinationLocation && (
                        <Marker 
                            position={[destinationLocation.lat, destinationLocation.lng]} 
                            icon={destinationIcon}
                        >
                            <Popup>
                                <strong>Destination:</strong><br />
                                {destinationLocation.address}
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
            
            {/* Enhanced Header */}
            <div className='absolute top-4 left-4 right-4 z-20'>
                <div className='bg-white rounded-2xl shadow-xl backdrop-blur-sm bg-opacity-95 p-4'>
                    <div className='flex justify-between items-center'>
                        <div className='flex items-center gap-3'>
                            <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg'>
                                QR
                            </div>
                            <div>
                                <h1 className='font-bold text-lg text-gray-800'>Quick Ride</h1>
                                <p className='text-sm text-gray-600'>
                                    {user?.fullname?.firstname ? `Welcome back, ${user.fullname.firstname}!` : 'Where to today?'}
                                </p>
                            </div>
                        </div>
                        
                        <div className='flex items-center gap-3'>
                            {/* Network Status Indicator */}
                            <div className={`w-3 h-3 rounded-full ${
                                networkStatus === 'online' ? 'bg-green-400' : 'bg-red-400'
                            }`} title={`Status: ${networkStatus}`}></div>
                            
                            {/* Refresh Button */}
                            <button 
                                onClick={resetRide}
                                className='bg-gradient-to-r from-gray-100 to-gray-200 p-3 rounded-xl shadow-md hover:shadow-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-300'
                                title="Reset and start over"
                            >
                                <i className="ri-refresh-line text-xl text-gray-700"></i>
                            </button>
                            
                            {/* User Profile Button */}
                            <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md'>
                                <i className="ri-user-line text-white"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main UI based on step */}
            {rideStep === 'selecting' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl backdrop-blur-sm bg-opacity-98 p-6 border-t-4 border-blue-500'>
                    <div className='flex items-center gap-3 mb-6'>
                        <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center'>
                            <i className="ri-map-pin-line text-white text-lg"></i>
                        </div>
                        <h2 className='text-2xl font-bold text-gray-800'>Book Your Ride</h2>
                    </div>
                    
                    {/* Selection mode toggle */}
                    <div className='flex mb-6 bg-gray-100 rounded-lg p-1'>
                        <button
                            onClick={() => setSelectionMode('pickup')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                                selectionMode === 'pickup' 
                                    ? 'bg-green-500 text-white shadow-md' 
                                    : 'text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <i className="ri-map-pin-line mr-2"></i>
                            Select Pickup
                        </button>
                        <button
                            onClick={() => setSelectionMode('destination')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                                selectionMode === 'destination' 
                                    ? 'bg-red-500 text-white shadow-md' 
                                    : 'text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <i className="ri-map-pin-line mr-2"></i>
                            Select Destination
                        </button>
                    </div>

                    {/* Selected locations */}
                    <div className='space-y-4 mb-6'>
                        <div className='flex items-center p-3 bg-green-50 rounded-lg border-l-4 border-green-500'>
                            <i className="ri-map-pin-line text-green-600 text-xl mr-3"></i>
                            <div className='flex-1'>
                                <p className='font-medium text-green-800'>Pickup Location</p>
                                <p className='text-sm text-green-600 truncate'>
                                    {pickupLocation ? pickupLocation.address : 'Tap on map to select pickup location'}
                                </p>
                            </div>
                        </div>

                        <div className='flex items-center p-3 bg-red-50 rounded-lg border-l-4 border-red-500'>
                            <i className="ri-map-pin-line text-red-600 text-xl mr-3"></i>
                            <div className='flex-1'>
                                <p className='font-medium text-red-800'>Destination</p>
                                <p className='text-sm text-red-600 truncate'>
                                    {destinationLocation ? destinationLocation.address : 'Tap on map to select destination'}
                                </p>
                            </div>
                        </div>

                        {/* Distance and Duration Display */}
                        {pickupLocation && destinationLocation && distance > 0 && (
                            <div className='flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500'>
                                <div className='flex items-center gap-2'>
                                    <i className="ri-route-line text-blue-600 text-xl"></i>
                                    <div>
                                        <p className='font-medium text-blue-800'>Trip Details</p>
                                        <p className='text-sm text-blue-600'>
                                            {distance.toFixed(1)} km • ~{duration} mins
                                        </p>
                                    </div>
                                </div>
                                <div className='text-right'>
                                    <p className='text-xs text-blue-600'>Est. Time</p>
                                    <p className='font-bold text-blue-800'>{duration} min</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* City Selection */}
                    {pickupLocation && destinationLocation && (
                        <div className='mb-6'>
                            <h3 className='font-semibold mb-4 text-gray-800'>Select City</h3>
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className='w-full p-4 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none'
                            >
                                <option value="">Select your city</option>
                                {cities.map((city) => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Vehicle Selection */}
                    {pickupLocation && destinationLocation && selectedCity && (
                        <div className='mb-6'>
                            <h3 className='font-semibold mb-4 text-gray-800'>Choose your ride in {selectedCity}</h3>
                            <div className='space-y-3'>
                                {vehicleTypesWithPricing.map((vehicle) => (
                                    <button
                                        key={vehicle.id}
                                        onClick={() => setSelectedVehicle(vehicle.id)}
                                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                            selectedVehicle === vehicle.id
                                                ? 'border-black bg-black text-white'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-3'>
                                                <span className='text-2xl'>{vehicle.icon}</span>
                                                <div>
                                                    <h4 className='font-semibold flex items-center gap-2'>
                                                        {vehicle.name}
                                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                                            selectedVehicle === vehicle.id 
                                                                ? 'bg-gray-700 text-gray-300' 
                                                                : 'bg-green-100 text-green-600'
                                                        }`}>
                                                            {driverCounts[vehicle.id]} available
                                                        </span>
                                                    </h4>
                                                    <p className={`text-sm ${
                                                        selectedVehicle === vehicle.id ? 'text-gray-300' : 'text-gray-600'
                                                    }`}>
                                                        {vehicle.description} • {(distance > 0 && !isNaN(distance)) ? distance.toFixed(1) : '0.0'} km
                                                    </p>
                                                </div>
                                            </div>
                                            <div className='text-right'>
                                                <div className='flex items-center gap-1 justify-end mb-1'>
                                                    <p className='font-bold text-lg'>₹{vehicle.price || vehicle.baseFare}</p>
                                                    {vehicle.surge && (
                                                        <span className='text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full'>
                                                            {vehicle.surgeMultiplier}x
                                                        </span>
                                                    )}
                                                </div>
                                                {vehicle.originalPrice && vehicle.price > vehicle.originalPrice && (
                                                    <p className={`text-xs line-through ${
                                                        selectedVehicle === vehicle.id ? 'text-gray-400' : 'text-gray-400'
                                                    }`}>
                                                        ₹{vehicle.originalPrice}
                                                    </p>
                                                )}
                                                <p className={`text-xs ${
                                                    selectedVehicle === vehicle.id ? 'text-gray-300' : 'text-gray-500'
                                                }`}>
                                                    ~{vehicle.estimatedTime || duration} mins
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Find Drivers button */}
                    <button
                        onClick={handleSelectDrivers}
                        disabled={!pickupLocation || !destinationLocation || !selectedCity}
                        className='w-full py-4 bg-black text-white rounded-xl font-semibold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors'
                    >
                        {!pickupLocation || !destinationLocation 
                            ? 'Select pickup and destination' 
                            : !selectedCity
                            ? 'Select your city'
                            : `Find ${vehicleTypesWithPricing.find(v => v.id === selectedVehicle)?.name} Drivers (${driverCounts[selectedVehicle]} available)`
                        }
                    </button>
                </div>
            )}

            {/* Available Drivers */}
            {rideStep === 'drivers' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl p-6' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className='flex items-center justify-between mb-6'>
                        <h2 className='text-xl font-bold'>Available Drivers in {selectedCity}</h2>
                        <button
                            onClick={() => setRideStep('selecting')}
                            className='text-gray-500 hover:text-gray-700'
                        >
                            <i className="ri-close-line text-xl"></i>
                        </button>
                    </div>

                    {loadingDrivers ? (
                        <div className='text-center py-8'>
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black mx-auto mb-4"></div>
                            <p className='text-gray-600'>Finding available drivers...</p>
                        </div>
                    ) : availableDrivers.length === 0 ? (
                        <div className='text-center py-8'>
                            <i className="ri-car-line text-4xl text-gray-400 mb-4 block"></i>
                            <h3 className='font-semibold text-gray-700 mb-2'>No drivers available</h3>
                            <p className='text-gray-500 mb-4'>Try selecting a different vehicle type or city</p>
                            <button
                                onClick={() => setRideStep('selecting')}
                                className='px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800'
                            >
                                Go Back
                            </button>
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            {availableDrivers.map((driver) => (
                                <div key={driver._id} className='border rounded-lg p-4 hover:bg-gray-50'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-4'>
                                            <div className='w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center'>
                                                <i className="ri-user-line text-xl text-gray-600"></i>
                                            </div>
                                            <div>
                                                <h3 className='font-semibold'>
                                                    {driver.fullname.firstname} {driver.fullname.lastname}
                                                </h3>
                                                <p className='text-sm text-gray-600'>
                                                    {driver.vehicle.color} {driver.vehicle.vehicleType.charAt(0).toUpperCase() + driver.vehicle.vehicleType.slice(1)}
                                                </p>
                                                <p className='text-xs text-gray-500'>
                                                    {driver.vehicle.plate} • Capacity: {driver.vehicle.capacity}
                                                </p>
                                            </div>
                                        </div>
                                        <div className='text-right'>
                                            <p className='font-bold text-lg'>₹{vehicleTypesWithPricing.find(v => v.id === selectedVehicle)?.price}</p>
                                            <p className='text-xs text-gray-500'>{(distance > 0 && !isNaN(distance)) ? distance.toFixed(1) : '0.0'} km</p>
                                            <button
                                                onClick={() => handleBookRideWithDriver(driver)}
                                                className='mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium'
                                            >
                                                Select Driver
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Booking step */}
            {rideStep === 'booking' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl p-6'>
                    <div className='text-center'>
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black mx-auto mb-4"></div>
                        <h2 className='text-xl font-bold mb-2'>Sending request to driver...</h2>
                        <p className='text-gray-600'>Please wait while the driver responds</p>
                        {selectedDriver && (
                            <div className='mt-4 p-4 bg-gray-100 rounded-lg'>
                                <p className='font-medium'>{selectedDriver.fullname.firstname} {selectedDriver.fullname.lastname}</p>
                                <p className='text-sm text-gray-600'>{selectedDriver.vehicle.color} {selectedDriver.vehicle.vehicleType}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Waiting for driver */}
            {rideStep === 'waiting' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl p-6'>
                    <div className='text-center'>
                        <div className="animate-pulse">
                            <div className='w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                <i className="ri-car-line text-2xl text-yellow-600"></i>
                            </div>
                        </div>
                        <h2 className='text-xl font-bold mb-2'>Looking for a driver...</h2>
                        <p className='text-gray-600'>We're connecting you with a nearby driver</p>
                        <div className='mt-4 p-3 bg-gray-100 rounded-lg'>
                            <p className='text-sm'><strong>From:</strong> {pickupLocation?.address}</p>
                            <p className='text-sm'><strong>To:</strong> {destinationLocation?.address}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Chatting with driver */}
            {rideStep === 'chatting' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl flex flex-col' style={{ height: '70vh' }}>
                    {/* Chat header */}
                    <div className='p-4 border-b bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-3xl'>
                        <div className='flex items-center justify-between mb-3'>
                            <div>
                                <h2 className='text-lg font-bold'>Driver Found! 🎉</h2>
                                <p className='text-sm opacity-90'>Your ride is confirmed</p>
                            </div>
                            <button
                                onClick={handleCompleteRide}
                                className='bg-white text-green-600 px-4 py-2 rounded-full font-medium hover:bg-gray-100 shadow-md'
                            >
                                End Ride
                            </button>
                        </div>
                        
                        {/* OTP Display */}
                        {ride?.otp && (
                            <div className='bg-white bg-opacity-20 rounded-xl p-3 mb-2'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex-1'>
                                        <p className='text-sm opacity-90'>Share this OTP with driver</p>
                                        <p className='text-2xl font-bold font-mono tracking-wider'>{ride.otp}</p>
                                        <button 
                                            onClick={handleResendOtp}
                                            disabled={otpResendCooldown > 0}
                                            className='text-xs bg-white bg-opacity-30 px-2 py-1 rounded mt-1 hover:bg-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                                        >
                                            {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend OTP'}
                                        </button>
                                    </div>
                                    <div className='text-right'>
                                        <p className='text-xs opacity-75'>Trip ID</p>
                                        <p className='text-sm font-mono'>{ride._id?.substring(0, 8)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Driver Info */}
                        <div className='bg-white bg-opacity-15 rounded-lg p-3'>
                            <div className='flex items-center gap-3'>
                                <div className='w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center'>
                                    <i className="ri-user-line text-xl"></i>
                                </div>
                                <div className='flex-1'>
                                    <h3 className='font-semibold'>
                                        {selectedDriver?.fullname?.firstname} {selectedDriver?.fullname?.lastname}
                                    </h3>
                                    <p className='text-sm opacity-90'>
                                        {selectedDriver?.vehicle?.color} {selectedDriver?.vehicle?.vehicleType} • {selectedDriver?.vehicle?.plate}
                                    </p>
                                </div>
                                <div className='text-right'>
                                    <div className='text-xs opacity-75'>Rating</div>
                                    <div className='flex items-center gap-1'>
                                        <span className='font-bold'>4.8</span>
                                        <i className="ri-star-fill text-yellow-300 text-sm"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages area */}
                    <div className='flex-1 p-4 overflow-y-auto'>
                        {messages.length === 0 ? (
                            <div className='text-center text-gray-500 mt-8'>
                                <i className="ri-chat-3-line text-3xl mb-2 block"></i>
                                <p>No messages yet. Say hello to your driver!</p>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {messages.map((message, index) => (
                                    <div 
                                        key={index}
                                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-xs p-3 rounded-lg ${
                                            message.sender === 'user' 
                                                ? 'bg-black text-white' 
                                                : 'bg-gray-200 text-gray-800'
                                        }`}>
                                            <p>{message.text}</p>
                                            <p className={`text-xs mt-1 ${
                                                message.sender === 'user' ? 'text-gray-300' : 'text-gray-500'
                                            }`}>
                                                {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Now'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Message input */}
                    <div className='p-4 border-t'>
                        <div className='flex gap-3'>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className='flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-black'
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                                className='px-6 py-3 bg-black text-white rounded-full font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800'
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ride Accepted */}
            {rideStep === 'accepted' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl p-6'>
                    <div className='text-center'>
                        <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                            <i className="ri-check-line text-2xl text-green-600"></i>
                        </div>
                        <h2 className='text-xl font-bold mb-2 text-green-600'>Ride Accepted! 🎉</h2>
                        <p className='text-gray-600 mb-4'>Your driver is on the way</p>
                        
                        {/* Prominent OTP Display - Show First */}
                        {ride?.otp && (
                            <div className='otp-display bg-gradient-to-r from-green-400 to-blue-500 rounded-xl p-4 mb-4 text-white shadow-lg border-2 border-yellow-300 animate-pulse'>
                                <div className='text-center'>
                                    <p className='text-sm opacity-90 mb-1'>🔐 Your Ride OTP</p>
                                    <p className='text-4xl font-bold font-mono tracking-wider mb-2 drop-shadow-lg'>{ride.otp}</p>
                                    <p className='text-sm opacity-90 font-medium'>📱 Share this code with your driver to start the trip</p>
                                    <button 
                                        onClick={handleResendOtp}
                                        disabled={otpResendCooldown > 0}
                                        className='mt-2 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                        {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend OTP'}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {ride && ride.captain && (
                            <div className='bg-gray-50 rounded-lg p-4 mb-4'>
                                <h3 className='font-semibold mb-2'>Driver Details</h3>
                                <p><strong>Name:</strong> {ride.captain.fullname?.firstname} {ride.captain.fullname?.lastname}</p>
                                <p><strong>Vehicle:</strong> {ride.captain.vehicle?.color} {ride.captain.vehicle?.vehicleType}</p>
                                <p><strong>Plate:</strong> {ride.captain.vehicle?.plate}</p>
                            </div>
                        )}
                        

                        
                        <button
                            onClick={() => setRideStep('chatting')}
                            className='w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 mb-3'
                        >
                            Chat with Driver
                        </button>
                        
                        <button
                            onClick={handleCompleteRide}
                            className='w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300'
                        >
                            Cancel Ride
                        </button>
                    </div>
                </div>
            )}

            {/* Driver Arriving */}
            {rideStep === 'driver-arriving' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl p-6'>
                    <div className='text-center'>
                        <div className="animate-bounce">
                            <div className='w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                <i className="ri-car-line text-2xl text-yellow-600"></i>
                            </div>
                        </div>
                        <h2 className='text-xl font-bold mb-2 text-yellow-600'>Driver Arriving!</h2>
                        <p className='text-gray-600 mb-4'>Your driver will be there shortly</p>
                        
                        {ride?.otp && (
                            <div className='bg-yellow-50 rounded-lg p-4 mb-4'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <p className='text-sm text-yellow-600 mb-1'>Share this OTP with driver</p>
                                        <p className='text-2xl font-bold text-yellow-700 font-mono'>{ride.otp}</p>
                                    </div>
                                    <button 
                                        onClick={handleResendOtp}
                                        disabled={otpResendCooldown > 0}
                                        className='text-xs bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                    >
                                        {otpResendCooldown > 0 ? `${otpResendCooldown}s` : 'Resend'}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <div className='flex gap-3'>
                            <button
                                onClick={() => setRideStep('chatting')}
                                className='flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600'
                            >
                                Chat
                            </button>
                            
                            <button
                                onClick={handleCompleteRide}
                                className='flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600'
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trip Started */}
            {rideStep === 'trip-started' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl p-6'>
                    <div className='text-center'>
                        <div className="animate-pulse">
                            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                <i className="ri-navigation-line text-2xl text-green-600"></i>
                            </div>
                        </div>
                        <h2 className='text-xl font-bold mb-2 text-green-600'>Trip in Progress 🚗</h2>
                        <p className='text-gray-600 mb-4'>Enjoy your ride!</p>
                        
                        <div className='bg-gray-50 rounded-lg p-4 mb-4'>
                            <div className='flex justify-between items-center mb-2'>
                                <span className='text-sm text-gray-600'>From:</span>
                                <span className='text-sm font-medium'>{pickupLocation?.address?.substring(0, 30)}...</span>
                            </div>
                            <div className='flex justify-between items-center mb-2'>
                                <span className='text-sm text-gray-600'>To:</span>
                                <span className='text-sm font-medium'>{destinationLocation?.address?.substring(0, 30)}...</span>
                            </div>
                            <div className='flex justify-between items-center'>
                                <span className='text-sm text-gray-600'>Distance:</span>
                                <span className='text-sm font-medium'>{(distance > 0 && !isNaN(distance)) ? distance.toFixed(1) : '0.0'} km</span>
                            </div>
                        </div>
                        
                        <div className='flex gap-3'>
                            <button
                                onClick={() => setRideStep('chatting')}
                                className='flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600'
                            >
                                Chat with Driver
                            </button>
                            
                            <button
                                onClick={handleCompleteRide}
                                className='flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600'
                            >
                                End Trip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Completed ride */}
            {rideStep === 'completed' && (
                <div className='absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl p-6'>
                    <div className='text-center'>
                        <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                            <i className="ri-check-line text-2xl text-green-600"></i>
                        </div>
                        <h2 className='text-xl font-bold mb-2'>Ride Completed!</h2>
                        <p className='text-gray-600 mb-6'>Thank you for using our service</p>
                        
                        <div className='space-y-3 mb-6 text-left bg-gray-50 p-4 rounded-lg'>
                            <div className='flex justify-between'>
                                <span>Ride fare:</span>
                                <span className='font-medium'>₹{ride?.fare || ride?.estimatedFare || 'Calculating...'}</span>
                            </div>
                            <div className='flex justify-between text-sm text-gray-600'>
                                <span>From: {pickupLocation?.address}</span>
                            </div>
                            <div className='flex justify-between text-sm text-gray-600'>
                                <span>To: {destinationLocation?.address}</span>
                            </div>
                        </div>

                        <button
                            onClick={resetRide}
                            className='w-full py-4 bg-black text-white rounded-xl font-semibold text-lg hover:bg-gray-800'
                        >
                            Book Another Ride
                        </button>
                    </div>
                </div>
            )}

            {/* Map instruction overlay */}
            {rideStep === 'selecting' && (
                <div className='absolute top-20 left-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4'>
                    <div className='flex items-center gap-3'>
                        <div className={`w-4 h-4 rounded-full ${
                            selectionMode === 'pickup' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <p className='text-sm font-medium'>
                            Tap on the map to select your {selectionMode} location
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Home