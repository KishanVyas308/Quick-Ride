import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;

// Custom marker icons
const createCustomIcon = (color = '#3B82F6') => {
    return new L.DivIcon({
        className: 'custom-div-icon',
        html: `
            <div style="
                background-color: ${color};
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                position: relative;
            ">
                <div style="
                    width: 6px;
                    height: 6px;
                    background-color: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                "></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

// Component to handle map centering
const MapController = ({ center }) => {
    const map = useMap();
    
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    
    return null;
};

const defaultCenter = [28.6139, 77.2090]; // Default to Delhi, India

const LiveTracking = () => {
    const [currentPosition, setCurrentPosition] = useState(defaultCenter);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const mapRef = useRef(null);
    const watchIdRef = useRef(null);

    const getCurrentLocation = () => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser.');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentPosition([latitude, longitude]);
                setLoading(false);
                console.log('Position updated:', latitude, longitude);
            },
            (err) => {
                setError('Unable to retrieve your location. Please check your location permissions.');
                setLoading(false);
                console.error('Geolocation error:', err);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    const startTracking = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser.');
            return;
        }

        setIsTracking(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentPosition([latitude, longitude]);
                console.log('Live position updated:', latitude, longitude);
            },
            (err) => {
                console.error('Watch position error:', err);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    };

    const stopTracking = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
    };

    useEffect(() => {
        getCurrentLocation();
        
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return (
        <div className="relative w-full h-full">
            {/* Loading overlay */}
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100 bg-opacity-75">
                    <div className="flex flex-col items-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-600">Finding your location...</p>
                    </div>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div className="absolute top-4 left-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">{error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <i className="ri-close-line text-lg"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* Map Container */}
            <MapContainer 
                ref={mapRef}
                center={currentPosition} 
                zoom={15} 
                style={{ width: '100%', height: '100%' }}
                className="z-0"
                scrollWheelZoom={true}
                doubleClickZoom={false}
                dragging={true}
                tap={false}
                touchZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />
                <MapController center={currentPosition} />
                <Marker 
                    position={currentPosition}
                    icon={createCustomIcon('#10B981')}
                >
                    <Popup closeButton={false} className="custom-popup">
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                                <i className="ri-map-pin-line text-green-600 text-lg"></i>
                            </div>
                            <p className="font-medium text-gray-800">You are here</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Lat: {currentPosition[0]?.toFixed(6)}<br/>
                                Lng: {currentPosition[1]?.toFixed(6)}
                            </p>
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>

            {/* Floating Controls - only show if not used as background */}
            {!loading && (
                <div className="absolute bottom-20 right-4 z-40 flex flex-col space-y-2">
                    {/* My Location Button */}
                    <button
                        onClick={getCurrentLocation}
                        disabled={loading}
                        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                        title="Get current location"
                    >
                        <i className={`ri-focus-3-line text-lg text-gray-700 ${loading ? 'animate-pulse' : ''}`}></i>
                    </button>

                    {/* Live Tracking Toggle */}
                    <button
                        onClick={isTracking ? stopTracking : startTracking}
                        className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 ${
                            isTracking 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : 'bg-white hover:bg-gray-50 text-gray-700'
                        }`}
                        title={isTracking ? 'Stop live tracking' : 'Start live tracking'}
                    >
                        <i className={`text-lg ${isTracking ? 'ri-stop-line animate-pulse' : 'ri-navigation-line'}`}></i>
                    </button>
                </div>
            )}

            {/* Custom CSS for popup */}
            <style jsx>{`
                .custom-popup .leaflet-popup-content-wrapper {
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                .custom-popup .leaflet-popup-content {
                    margin: 12px;
                    line-height: 1.4;
                }
                .custom-popup .leaflet-popup-tip {
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
            `}</style>
        </div>
    )
}

export default LiveTracking