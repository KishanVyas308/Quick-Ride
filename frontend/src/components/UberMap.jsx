import React, { useState, useCallback, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import axios from 'axios'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
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

const currentLocationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to handle map clicks for location selection
function LocationSelector({ onLocationSelect, mode }) {
    useMapEvents({
        click: async (e) => {
            if (mode && onLocationSelect) {
                const { lat, lng } = e.latlng;
                
                try {
                    // Reverse geocoding to get address
                    const response = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                        {
                            headers: {
                                'User-Agent': 'quick-ride-app'
                            }
                        }
                    );
                    
                    const address = response.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    
                    onLocationSelect({
                        lat,
                        lng,
                        address,
                        type: mode
                    });
                } catch (error) {
                    console.error('Reverse geocoding failed:', error);
                    onLocationSelect({
                        lat,
                        lng,
                        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                        type: mode
                    });
                }
            }
        }
    });
    
    return null;
}

// Component to fit bounds when markers change
function FitBounds({ pickupLocation, destinationLocation }) {
    const map = useMap();
    
    useEffect(() => {
        if (pickupLocation && destinationLocation) {
            const bounds = L.latLngBounds([
                [pickupLocation.lat, pickupLocation.lng],
                [destinationLocation.lat, destinationLocation.lng]
            ]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [pickupLocation, destinationLocation, map]);
    
    return null;
}

const QuickRideMap = ({ 
    pickupLocation, 
    destinationLocation, 
    currentLocation, 
    onLocationSelect, 
    selectionMode = null,
    showRoute = false,
    height = "100%",
    className = ""
}) => {
    const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default to Delhi
    const [mapKey, setMapKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Get user's current location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMapCenter([latitude, longitude]);
                    setIsLoading(false);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setIsLoading(false);
                }
            );
        } else {
            setIsLoading(false);
        }
    }, []);

    // Function to center map on current location
    const centerOnCurrentLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMapCenter([latitude, longitude]);
                    setMapKey(prev => prev + 1); // Force map re-render
                }
            );
        }
    }, []);

    if (isLoading) {
        return (
            <div 
                className={`flex items-center justify-center bg-gray-100 ${className}`}
                style={{ height }}
            >
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading map...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`} style={{ height }}>
            <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={15}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Location selector for click events */}
                <LocationSelector 
                    onLocationSelect={onLocationSelect} 
                    mode={selectionMode} 
                />
                
                {/* Fit bounds when both locations are available */}
                <FitBounds 
                    pickupLocation={pickupLocation} 
                    destinationLocation={destinationLocation} 
                />

                {/* Current location marker */}
                {currentLocation && (
                    <Marker 
                        position={[currentLocation.lat, currentLocation.lng]} 
                        icon={currentLocationIcon}
                    >
                        <Popup>
                            <div className="text-center">
                                <strong>Your Location</strong>
                                <br />
                                <small>{currentLocation.address || 'Current position'}</small>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Pickup location marker */}
                {pickupLocation && (
                    <Marker 
                        position={[pickupLocation.lat, pickupLocation.lng]} 
                        icon={pickupIcon}
                    >
                        <Popup>
                            <div className="text-center">
                                <strong>Pickup Location</strong>
                                <br />
                                <small>{pickupLocation.address}</small>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Destination location marker */}
                {destinationLocation && (
                    <Marker 
                        position={[destinationLocation.lat, destinationLocation.lng]} 
                        icon={destinationIcon}
                    >
                        <Popup>
                            <div className="text-center">
                                <strong>Destination</strong>
                                <br />
                                <small>{destinationLocation.address}</small>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
                {/* Current Location Button */}
                <button
                    onClick={centerOnCurrentLocation}
                    className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                    title="Center on current location"
                >
                    <i className="ri-focus-3-line text-xl text-gray-700"></i>
                </button>
            </div>

            {/* Selection Mode Indicator */}
            {selectionMode && (
                <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-lg z-[1000]">
                    <div className="flex items-center gap-2">
                        {selectionMode === 'pickup' && (
                            <>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium">Tap to select pickup location</span>
                            </>
                        )}
                        {selectionMode === 'destination' && (
                            <>
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm font-medium">Tap to select destination</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickRideMap;