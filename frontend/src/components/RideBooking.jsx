import React, { useState, useEffect } from 'react'
import axios from 'axios'

const RideBooking = ({ 
    pickupLocation, 
    destinationLocation, 
    onRideBooked, 
    onClose,
    className = "" 
}) => {
    const [fareData, setFareData] = useState(null)
    const [selectedVehicle, setSelectedVehicle] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isBooking, setIsBooking] = useState(false)

    // Vehicle types with pricing
    const vehicleTypes = [
        {
            id: 'quick-ride-go',
            name: 'Quick Go',
            description: 'Affordable, everyday rides',
            capacity: 4,
            icon: '🚗',
            baseFare: 50,
            perKmRate: 12,
            perMinRate: 2
        },
        {
            id: 'quick-ride-premier',
            name: 'Quick Premier',
            description: 'Comfortable sedans, top-quality drivers',
            capacity: 4,
            icon: '🚙',
            baseFare: 80,
            perKmRate: 18,
            perMinRate: 3
        },
        {
            id: 'quick-ride-xl',
            name: 'Quick XL',
            description: 'Spacious SUVs for up to 6 people',
            capacity: 6,
            icon: '🚐',
            baseFare: 120,
            perKmRate: 25,
            perMinRate: 4
        }
    ]

    // Calculate fare when locations are available
    useEffect(() => {
        if (pickupLocation && destinationLocation) {
            calculateFare()
        }
    }, [pickupLocation, destinationLocation])

    const calculateFare = async () => {
        setIsLoading(true)
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_BASE_URL}/rides/get-fare`,
                {
                    params: {
                        pickup: pickupLocation.address,
                        destination: destinationLocation.address
                    },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            
            setFareData(response.data)
        } catch (error) {
            console.error('Error calculating fare:', error)
            // Fallback calculation
            const estimatedDistance = calculateDistance(pickupLocation, destinationLocation)
            const estimatedTime = estimatedDistance / 40 * 60 // Assuming 40 km/h average speed
            
            setFareData({
                distance: { text: `${estimatedDistance.toFixed(1)} km` },
                duration: { text: `${Math.round(estimatedTime)} mins` }
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Haversine formula for distance calculation
    const calculateDistance = (loc1, loc2) => {
        const R = 6371 // Earth's radius in kilometers
        const dLat = (loc2.lat - loc1.lat) * Math.PI / 180
        const dLon = (loc2.lng - loc1.lng) * Math.PI / 180
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        return R * c
    }

    const calculateVehicleFare = (vehicleType, distance, duration) => {
        const distanceKm = distance || 5 // Default 5km if not available
        const durationMins = duration || 15 // Default 15 mins if not available
        
        const fare = vehicleType.baseFare + 
                    (distanceKm * vehicleType.perKmRate) + 
                    (durationMins * vehicleType.perMinRate)
        
        return Math.round(fare)
    }

    const handleVehicleSelect = (vehicle) => {
        setSelectedVehicle(vehicle)
    }

    const handleBookRide = async () => {
        if (!selectedVehicle || !pickupLocation || !destinationLocation) return

        setIsBooking(true)
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/rides/create`,
                {
                    pickup: pickupLocation.address,
                    destination: destinationLocation.address,
                    vehicleType: selectedVehicle.id
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            
            if (onRideBooked) {
                onRideBooked(response.data)
            }
        } catch (error) {
            console.error('Error booking ride:', error)
            alert('Failed to book ride. Please try again.')
        } finally {
            setIsBooking(false)
        }
    }

    if (!pickupLocation || !destinationLocation) {
        return null
    }

    const distance = fareData?.distance?.text ? parseFloat(fareData.distance.text) : 5
    const duration = fareData?.duration?.text ? parseInt(fareData.duration.text) : 15

    return (
        <div className={`bg-white rounded-t-xl shadow-lg ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Choose a ride</h2>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <i className="ri-close-line text-xl"></i>
                </button>
            </div>

            {/* Trip Details */}
            <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center mt-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="w-0.5 h-8 bg-gray-300"></div>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                        <div className="mb-3">
                            <p className="text-sm font-medium truncate">{pickupLocation.address}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium truncate">{destinationLocation.address}</p>
                        </div>
                    </div>
                </div>
                
                {fareData && (
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                        <span><i className="ri-route-line"></i> {fareData.distance?.text || 'N/A'}</span>
                        <span><i className="ri-time-line"></i> {fareData.duration?.text || 'N/A'}</span>
                    </div>
                )}
            </div>

            {/* Vehicle Options */}
            <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black"></div>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {vehicleTypes.map((vehicle) => {
                            const fare = calculateVehicleFare(vehicle, distance, duration)
                            const isSelected = selectedVehicle?.id === vehicle.id
                            
                            return (
                                <button
                                    key={vehicle.id}
                                    onClick={() => handleVehicleSelect(vehicle)}
                                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                        isSelected 
                                            ? 'border-black bg-black text-white' 
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{vehicle.icon}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{vehicle.name}</h3>
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        isSelected ? 'bg-white text-black' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {vehicle.capacity} seats
                                                    </span>
                                                </div>
                                                <p className={`text-sm ${
                                                    isSelected ? 'text-gray-200' : 'text-gray-600'
                                                }`}>
                                                    {vehicle.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">₹{fare}</p>
                                            {fareData && (
                                                <p className={`text-xs ${
                                                    isSelected ? 'text-gray-200' : 'text-gray-500'
                                                }`}>
                                                    {fareData.duration?.text || 'N/A'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Book Button */}
            <div className="p-4 border-t bg-gray-50">
                <button
                    onClick={handleBookRide}
                    disabled={!selectedVehicle || isBooking}
                    className="w-full py-3 bg-black text-white rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isBooking ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Booking...
                        </div>
                    ) : selectedVehicle ? (
                        `Book ${selectedVehicle.name}`
                    ) : (
                        'Select a ride option'
                    )}
                </button>
            </div>
        </div>
    )
}

export default RideBooking