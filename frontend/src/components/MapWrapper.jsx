import React from 'react'
import EnhancedMap from './EnhancedMap'

const MapWrapper = ({ 
    className = '', 
    height = '100%',
    markers = [],
    route = [],
    showControls = true,
    enableLiveTracking = true,
    onLocationUpdate,
    children
}) => {
    return (
        <div className={`relative ${className}`} style={{ height }}>
            <EnhancedMap
                markers={markers}
                route={route}
                showControls={showControls}
                height={height}
                enableLiveTracking={enableLiveTracking}
                onLocationUpdate={onLocationUpdate}
            />
            
            {/* Overlay content */}
            {children && (
                <div className="absolute inset-0 pointer-events-none z-30">
                    <div className="relative w-full h-full pointer-events-auto">
                        {children}
                    </div>
                </div>
            )}
        </div>
    )
}

export default MapWrapper