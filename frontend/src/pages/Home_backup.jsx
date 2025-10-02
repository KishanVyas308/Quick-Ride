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
                            headers: { 'User-Agent': 'uber-clone-app' }
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
    // Simplified state
    const [pickupLocation, setPickupLocation] = useState(null)
    const [destinationLocation, setDestinationLocation] = useState(null)
    const [currentLocation, setCurrentLocation] = useState([28.6139, 77.2090])
    const [selectionMode, setSelectionMode] = useState('pickup') // 'pickup' or 'destination'
    const [rideStep, setRideStep] = useState('selecting') // 'selecting', 'booking', 'waiting', 'chatting', 'completed'
    const [ride, setRide] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')

    const navigate = useNavigate()
    const { socket } = useContext(SocketContext)
    const { user } = useContext(UserDataContext)

    // Get current location on load
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords
                    setCurrentLocation([latitude, longitude])
                },
                (error) => {
                    console.error('Geolocation error:', error)
                }
            )
        }
    }, [])

    // Socket setup
    useEffect(() => {
        if (user && socket) {
            socket.emit("join", { userType: "user", userId: user._id })
            
            // Listen for ride confirmation
            socket.on('ride-confirmed', (rideData) => {
                setRide(rideData)
                setRideStep('chatting')
            })
            
            // Listen for messages
            socket.on('message', (message) => {
                setMessages(prev => [...prev, message])
            })
        }
    }, [user, socket])

    // Handle map clicks
    const handleMapClick = (locationData) => {
        if (locationData.type === 'pickup') {
            setPickupLocation(locationData)
        } else if (locationData.type === 'destination') {
            setDestinationLocation(locationData)
        }
    }

    // Book ride
    const handleBookRide = async () => {
        if (!pickupLocation || !destinationLocation) return
        
        setRideStep('booking')
        
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
                pickup: pickupLocation.address,
                destination: destinationLocation.address,
                vehicleType: 'uber-go'
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            
            setRide(response.data)
            setRideStep('waiting')
            
        } catch (error) {
            console.error('Error booking ride:', error)
            alert('Failed to book ride. Please try again.')
            setRideStep('selecting')
        }
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

    // Complete ride
    const handleCompleteRide = () => {
        setRideStep('completed')
        // Could also emit to socket to notify driver
    }

    useGSAP(function () {
        if (panelOpen) {
            gsap.to(panelRef.current, {
                height: '70%',
                padding: 24
                // opacity:1
            })
            gsap.to(panelCloseRef.current, {
                opacity: 1
            })
        } else {
            gsap.to(panelRef.current, {
                height: '0%',
                padding: 0
                // opacity:0
            })
            gsap.to(panelCloseRef.current, {
                opacity: 0
            })
        }
    }, [ panelOpen ])


    useGSAP(function () {
        if (vehiclePanel) {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ vehiclePanel ])

    useGSAP(function () {
        if (confirmRidePanel) {
            gsap.to(confirmRidePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(confirmRidePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ confirmRidePanel ])

    useGSAP(function () {
        if (vehicleFound) {
            gsap.to(vehicleFoundRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(vehicleFoundRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ vehicleFound ])

    useGSAP(function () {
        if (waitingForDriver) {
            gsap.to(waitingForDriverRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(waitingForDriverRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ waitingForDriver ])


    async function findTrip() {
        setVehiclePanel(true)
        setPanelOpen(false)

        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/get-fare`, {
            params: { pickup, destination },
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })


        setFare(response.data)


    }

    async function createRide() {
        const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
            pickup,
            destination,
            vehicleType
        }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })


    }

    return (
        <div className='h-screen relative overflow-hidden'>
            {/* Enhanced Map as background */}
            <div className='absolute inset-0 z-0'>
                <UberMap 
                    pickupLocation={pickupLocation}
                    destinationLocation={destinationLocation}
                    currentLocation={currentLocation}
                    onLocationSelect={handleLocationSelect}
                    selectionMode={mapSelectionMode}
                    height="100vh"
                />
            </div>
            
            {/* Header with logo and user menu */}
            <div className='absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center'>
                <img 
                    className='w-16 bg-white p-2 rounded-lg shadow-lg' 
                    src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" 
                    alt="Uber" 
                />
                <button className='bg-white p-2 rounded-full shadow-lg'>
                    <i className="ri-menu-line text-xl text-gray-700"></i>
                </button>
            </div>
            
            {/* Main UI Panel Container */}
            <div className='flex flex-col justify-end h-screen absolute top-0 w-full z-10'>
                {/* Main Input Panel */}
                <div className='bg-white rounded-t-2xl shadow-2xl p-6 relative'>
                    <h5 ref={panelCloseRef} onClick={() => {
                        setPanelOpen(false)
                    }} className='absolute opacity-0 right-6 top-6 text-2xl cursor-pointer'>
                        <i className="ri-arrow-down-wide-line"></i>
                    </h5>
                    
                    <h4 className='text-2xl font-bold mb-4'>Where to?</h4>
                    
                    <form className='space-y-4' onSubmit={submitHandler}>
                        {/* Enhanced Location Inputs */}
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <LocationInput
                                value={pickup}
                                onChange={handlePickupChange}
                                onLocationSelect={handleLocationSelect}
                                placeholder="Pickup location"
                                type="pickup"
                                className="pl-12"
                            />
                            <button
                                type="button"
                                onClick={() => handleMapModeToggle('pickup')}
                                className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-1 rounded ${
                                    mapSelectionMode === 'pickup' ? 'bg-green-100 text-green-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="Select on map"
                            >
                                <i className="ri-map-pin-line"></i>
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            </div>
                            <LocationInput
                                value={destination}
                                onChange={handleDestinationChange}
                                onLocationSelect={handleLocationSelect}
                                placeholder="Where to?"
                                type="destination"
                                className="pl-12"
                            />
                            <button
                                type="button"
                                onClick={() => handleMapModeToggle('destination')}
                                className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-1 rounded ${
                                    mapSelectionMode === 'destination' ? 'bg-red-100 text-red-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="Select on map"
                            >
                                <i className="ri-map-pin-line"></i>
                            </button>
                        </div>

                        {/* Enhanced Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={proceedToBooking}
                                disabled={!pickupLocation || !destinationLocation}
                                className='flex-1 bg-black text-white py-4 rounded-xl font-semibold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
                            >
                                See prices
                            </button>
                            
                            {(pickupLocation || destinationLocation) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPickupLocation(null)
                                        setDestinationLocation(null)
                                        setPickup('')
                                        setDestination('')
                                        setMapSelectionMode(null)
                                    }}
                                    className='px-4 py-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors'
                                    title="Clear locations"
                                >
                                    <i className="ri-close-line text-lg"></i>
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Quick Actions */}
                    {!panelOpen && (
                        <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                            <button className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full whitespace-nowrap">
                                <i className="ri-time-line text-gray-600"></i>
                                <span className="text-sm">Schedule</span>
                            </button>
                            <button className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full whitespace-nowrap">
                                <i className="ri-group-line text-gray-600"></i>
                                <span className="text-sm">Ride together</span>
                            </button>
                            <button className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full whitespace-nowrap">
                                <i className="ri-gift-line text-gray-600"></i>
                                <span className="text-sm">Send package</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Location Search Panel */}
                <div ref={panelRef} className='bg-white h-0 overflow-hidden'>
                    <LocationSearchPanel
                        suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions}
                        setPanelOpen={setPanelOpen}
                        setVehiclePanel={setVehiclePanel}
                        setPickup={setPickup}
                        setDestination={setDestination}
                        activeField={activeField}
                    />
                </div>
            </div>

            {/* Enhanced Ride Booking Panel */}
            {showRideBooking && (
                <div className='fixed inset-0 z-30 flex items-end'>
                    <div className='absolute inset-0 bg-black bg-opacity-50' onClick={() => setShowRideBooking(false)}></div>
                    <RideBooking
                        pickupLocation={pickupLocation}
                        destinationLocation={destinationLocation}
                        onRideBooked={handleRideBooked}
                        onClose={() => setShowRideBooking(false)}
                        className="relative w-full max-h-[80vh]"
                    />
                </div>
            )}

            {/* Legacy Panels (keeping for compatibility) */}
            <div ref={vehiclePanelRef} className='fixed w-full z-20 bottom-0 translate-y-full bg-white px-3 py-10 pt-12 rounded-t-2xl'>
                <VehiclePanel
                    selectVehicle={setVehicleType}
                    fare={fare} 
                    setConfirmRidePanel={setConfirmRidePanel} 
                    setVehiclePanel={setVehiclePanel} 
                />
            </div>
            
            <div ref={confirmRidePanelRef} className='fixed w-full z-20 bottom-0 translate-y-full bg-white px-3 py-6 pt-12 rounded-t-2xl'>
                <ConfirmRide
                    createRide={createRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setConfirmRidePanel={setConfirmRidePanel} 
                    setVehicleFound={setVehicleFound} 
                />
            </div>
            
            <div ref={vehicleFoundRef} className='fixed w-full z-20 bottom-0 translate-y-full bg-white px-3 py-6 pt-12 rounded-t-2xl'>
                <LookingForDriver
                    createRide={createRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setVehicleFound={setVehicleFound} 
                />
            </div>
            
            <div ref={waitingForDriverRef} className='fixed w-full z-20 bottom-0 bg-white px-3 py-6 pt-12 rounded-t-2xl'>
                <WaitingForDriver
                    ride={ride}
                    setVehicleFound={setVehicleFound}
                    setWaitingForDriver={setWaitingForDriver}
                    waitingForDriver={waitingForDriver} 
                />
            </div>
        </div>
    )
}

export default Home