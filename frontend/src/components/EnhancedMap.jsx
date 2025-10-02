import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;

// Custom marker icons
const createCustomIcon = (type = 'current', color = '#3B82F6') => {
    const iconConfigs = {
        current: {
            color: '#10B981',
            size: 28,
            icon: '●'
        },
        pickup: {
            color: '#3B82F6',
            size: 32,
            icon: '📍'
        },
        destination: {
            color: '#EF4444',
            size: 32,
            icon: '🎯'
        },
        captain: {
            color: '#F59E0B',
            size: 30,
            icon: '🚗'
        }
    };

    const config = iconConfigs[type] || iconConfigs.current;

    return new L.DivIcon({
        className: 'custom-div-icon',
        html: `
            <div style="
                background: linear-gradient(135deg, ${config.color}, ${config.color}dd);
                width: ${config.size}px;
                height: ${config.size}px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${config.size * 0.4}px;
                animation: ${type === 'current' ? 'pulse 2s infinite' : 'none'};
            ">
                ${config.icon}
            </div>
            <style>
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            </style>
        `,
        iconSize: [config.size, config.size],
        iconAnchor: [config.size / 2, config.size / 2]
    });
};

// Component to handle map centering and bounds
const MapController = ({ center, bounds, markers }) => {
    const map = useMap();
    
    useEffect(() => {
        if (bounds && markers && markers.length > 1) {
            // Fit map to show all markers
            const leafletBounds = L.latLngBounds(markers);
            map.fitBounds(leafletBounds, { padding: [50, 50] });
        } else if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, bounds, markers, map]);
    
    return null;
};

const EnhancedMap = ({ 
    markers = [], 
    route = [], 
    showControls = true, 
    height = '100%', 
    defaultCenter = [28.6139, 77.2090],
    className = '',
    onLocationUpdate,
    enableLiveTracking = false
}) => {
    const [currentPosition, setCurrentPosition] = useState(defaultCenter);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef(null);
    const watchIdRef = useRef(null);

    // Calculate map bounds if multiple markers exist
    const allPositions = [
        currentPosition,
        ...markers.map(m => [m.lat, m.lng])
    ].filter(pos => pos && pos[0] && pos[1]);

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
                const newPosition = [latitude, longitude];
                setCurrentPosition(newPosition);
                setLoading(false);
                
                if (onLocationUpdate) {
                    onLocationUpdate({ lat: latitude, lng: longitude });
                }
            },
            (err) => {
                setError('Unable to retrieve location. Check permissions.');
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
        if (!navigator.geolocation || !enableLiveTracking) return;

        setIsTracking(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newPosition = [latitude, longitude];
                setCurrentPosition(newPosition);
                
                if (onLocationUpdate) {
                    onLocationUpdate({ lat: latitude, lng: longitude });
                }
            },
            (err) => console.error('Watch position error:', err),
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

    const handleMapReady = () => {
        setMapReady(true);
    };

    return (
        <div className={`relative w-full ${className}`} style={{ height }}>
            {/* Loading State */}
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50">
                    <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-xl shadow-lg">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-600 font-medium">Loading map...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="absolute top-4 left-4 right-4 z-50 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-lg">
                    <div className="flex items-start">
                        <i className="ri-alert-line text-red-500 text-xl mr-3 mt-1"></i>
                        <div className="flex-1">
                            <h3 className="text-red-800 font-medium">Location Error</h3>
                            <p className="text-red-700 text-sm mt-1">{error}</p>
                        </div>
                        <button 
                            onClick={() => setError(null)}
                            className="text-red-500 hover:text-red-700 ml-2"
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
                className="z-10 rounded-lg"
                scrollWheelZoom={true}
                doubleClickZoom={true}
                dragging={true}
                whenReady={handleMapReady}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />
                
                <MapController 
                    center={currentPosition} 
                    bounds={allPositions.length > 1}
                    markers={allPositions}
                />

                {/* Current Location Marker */}
                <Marker 
                    position={currentPosition}
                    icon={createCustomIcon('current')}
                >
                    <Popup closeButton={false} className="custom-popup">
                        <div className="text-center p-2">
                            <div className="flex items-center justify-center mb-2">
                                <i className="ri-navigation-line text-green-600 text-xl"></i>
                            </div>
                            <h3 className="font-semibold text-gray-800 mb-1">Your Location</h3>
                            <p className="text-xs text-gray-500">
                                {currentPosition[0]?.toFixed(4)}, {currentPosition[1]?.toFixed(4)}
                            </p>
                            {isTracking && (
                                <div className="mt-2 flex items-center justify-center text-green-600 text-xs">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                                    Live tracking active
                                </div>
                            )}
                        </div>
                    </Popup>
                </Marker>

                {/* Additional Markers */}
                {markers.map((marker, index) => (
                    <Marker 
                        key={index}
                        position={[marker.lat, marker.lng]}
                        icon={createCustomIcon(marker.type || 'pickup')}
                    >
                        <Popup className="custom-popup">
                            <div className="p-2">
                                <h3 className="font-semibold text-gray-800 mb-1">
                                    {marker.title || 'Location'}
                                </h3>
                                {marker.address && (
                                    <p className="text-sm text-gray-600 mb-2">{marker.address}</p>
                                )}
                                <p className="text-xs text-gray-500">
                                    {marker.lat?.toFixed(4)}, {marker.lng?.toFixed(4)}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Route Polyline */}
                {route.length > 1 && (
                    <Polyline 
                        positions={route} 
                        color="#3B82F6"
                        weight={4}
                        opacity={0.8}
                        dashArray="10,10"
                    />
                )}
            </MapContainer>

            {/* Floating Controls */}
            {showControls && mapReady && (
                <div className="absolute bottom-4 right-4 z-40 flex flex-col space-y-3">
                    {/* Refresh Location Button */}
                    <button
                        onClick={getCurrentLocation}
                        disabled={loading}
                        className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 hover:scale-105"
                        title="Refresh location"
                    >
                        <i className={`ri-refresh-line text-xl text-gray-700 ${loading ? 'animate-spin' : ''}`}></i>
                    </button>

                    {/* Center on Location */}
                    <button
                        onClick={() => getCurrentLocation()}
                        className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                        title="Center on my location"
                    >
                        <i className="ri-focus-3-line text-xl text-gray-700"></i>
                    </button>

                    {/* Live Tracking Toggle (if enabled) */}
                    {enableLiveTracking && (
                        <button
                            onClick={isTracking ? stopTracking : startTracking}
                            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                                isTracking 
                                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                                    : 'bg-white hover:bg-gray-50 text-gray-700'
                            }`}
                            title={isTracking ? 'Stop live tracking' : 'Start live tracking'}
                        >
                            <i className={`text-xl ${isTracking ? 'ri-stop-circle-line' : 'ri-navigation-line'}`}></i>
                        </button>
                    )}
                </div>
            )}

            {/* Status Indicators */}
            <div className="absolute top-4 left-4 z-40 flex flex-col space-y-2">
                {/* Live Tracking Indicator */}
                {isTracking && (
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center space-x-2 animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <span>Live Tracking Active</span>
                    </div>
                )}

                {/* Route Info */}
                {route.length > 1 && (
                    <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center space-x-2">
                        <i className="ri-route-line"></i>
                        <span>Route displayed</span>
                    </div>
                )}
            </div>

            {/* Custom Styles */}
            <style jsx>{`
                .custom-popup .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    border: none;
                }
                .custom-popup .leaflet-popup-content {
                    margin: 0;
                    line-height: 1.4;
                }
                .custom-popup .leaflet-popup-tip {
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                .leaflet-control-attribution {
                    font-size: 10px;
                    background: rgba(255, 255, 255, 0.8);
                }
            `}</style>
        </div>
    );
};

export default EnhancedMap;