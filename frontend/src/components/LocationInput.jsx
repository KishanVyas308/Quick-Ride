import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const LocationInput = ({ 
    value, 
    onChange, 
    onLocationSelect,
    placeholder, 
    type = 'pickup', // 'pickup' or 'destination'
    className = "",
    disabled = false 
}) => {
    const [suggestions, setSuggestions] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const inputRef = useRef(null)
    const suggestionsRef = useRef(null)

    // Debounce search to avoid too many API calls
    useEffect(() => {
        if (value && value.length > 2) {
            const timeoutId = setTimeout(() => {
                fetchSuggestions(value)
            }, 300)
            
            return () => clearTimeout(timeoutId)
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
    }, [value])

    const fetchSuggestions = async (input) => {
        if (!input || input.length < 3) return

        setIsLoading(true)
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`,
                {
                    params: { input },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            
            setSuggestions(response.data || [])
            setShowSuggestions(true)
            setSelectedIndex(-1)
        } catch (error) {
            console.error('Error fetching suggestions:', error)
            setSuggestions([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSuggestionSelect = async (suggestion) => {
        onChange({ target: { value: suggestion } })
        setShowSuggestions(false)
        setSuggestions([])
        
        if (onLocationSelect) {
            try {
                // Get coordinates for the selected address
                const response = await axios.get(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(suggestion)}&limit=1`,
                    {
                        headers: {
                            'User-Agent': 'quick-ride-app'
                        }
                    }
                )
                
                if (response.data && response.data.length > 0) {
                    const location = response.data[0]
                    onLocationSelect({
                        lat: parseFloat(location.lat),
                        lng: parseFloat(location.lon),
                        address: suggestion,
                        type
                    })
                }
            } catch (error) {
                console.error('Error getting coordinates:', error)
            }
        }
    }

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev
                )
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
                break
            case 'Enter':
                e.preventDefault()
                if (selectedIndex >= 0) {
                    handleSuggestionSelect(suggestions[selectedIndex])
                }
                break
            case 'Escape':
                setShowSuggestions(false)
                setSelectedIndex(-1)
                break
        }
    }

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords
                    
                    try {
                        // Reverse geocoding to get address
                        const response = await axios.get(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
                            {
                                headers: {
                                    'User-Agent': 'quick-ride-app'
                                }
                            }
                        )
                        
                        const address = response.data?.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                        
                        onChange({ target: { value: address } })
                        
                        if (onLocationSelect) {
                            onLocationSelect({
                                lat: latitude,
                                lng: longitude,
                                address,
                                type
                            })
                        }
                    } catch (error) {
                        console.error('Reverse geocoding failed:', error)
                        const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                        onChange({ target: { value: address } })
                        
                        if (onLocationSelect) {
                            onLocationSelect({
                                lat: latitude,
                                lng: longitude,
                                address,
                                type
                            })
                        }
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error)
                    alert('Unable to get your location. Please check your browser settings.')
                }
            )
        } else {
            alert('Geolocation is not supported by this browser.')
        }
    }

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                inputRef.current && 
                !inputRef.current.contains(event.target) &&
                suggestionsRef.current && 
                !suggestionsRef.current.contains(event.target)
            ) {
                setShowSuggestions(false)
                setSelectedIndex(-1)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={onChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full p-3 pr-12 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${className}`}
                />
                
                {/* Current Location Button */}
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={disabled}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-black transition-colors disabled:opacity-50"
                    title="Use current location"
                >
                    <i className="ri-crosshair-line text-lg"></i>
                </button>

                {/* Loading indicator */}
                {isLoading && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-black"></div>
                    </div>
                )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className={`w-full p-3 text-left hover:bg-gray-100 border-b last:border-b-0 transition-colors ${
                                index === selectedIndex ? 'bg-gray-100' : ''
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <i className={`ri-map-pin-line text-lg ${
                                    type === 'pickup' ? 'text-green-600' : 'text-red-600'
                                }`}></i>
                                <span className="text-sm">{suggestion}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default LocationInput