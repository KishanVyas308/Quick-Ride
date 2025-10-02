# Free Map Migration - OpenStreetMap Implementation

This project has been migrated from Google Maps to OpenStreetMap (OSM) to eliminate dependency on paid APIs and API keys.

## Changes Made

### Backend Changes
- **Maps Service (`Backend/services/maps.service.js`)**: 
  - Replaced Google Maps Geocoding API with OpenStreetMap Nominatim API
  - Replaced Google Maps Distance Matrix API with Haversine formula calculation
  - Replaced Google Places API with Nominatim search for autocomplete suggestions

### Frontend Changes
- **Package Dependencies**:
  - Removed: `@react-google-maps/api`
  - Added: `leaflet` and `react-leaflet`
- **LiveTracking Component**: 
  - Replaced Google Maps with Leaflet map implementation
  - Uses OpenStreetMap tiles (completely free)

### Environment Variables
- Removed all Google Maps API key requirements
- No external API keys needed anymore

## Free APIs Used

### 1. OpenStreetMap Nominatim API
- **Purpose**: Geocoding (address to coordinates) and reverse geocoding
- **Endpoint**: `https://nominatim.openstreetmap.org/`
- **Cost**: Completely free
- **Rate Limit**: 1 request per second (fair use policy)
- **Documentation**: https://nominatim.org/release-docs/develop/api/Overview/

### 2. OpenStreetMap Tiles
- **Purpose**: Map rendering
- **Endpoint**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Cost**: Completely free
- **Usage Policy**: Follow OSM tile usage policy
- **Documentation**: https://wiki.openstreetmap.org/wiki/Tile_servers

## Features Maintained

✅ **Address to Coordinate Conversion**: Uses Nominatim geocoding  
✅ **Distance Calculation**: Uses Haversine formula for straight-line distance  
✅ **Travel Time Estimation**: Estimates based on average city speed (40 km/h)  
✅ **Address Autocomplete**: Uses Nominatim search with suggestions  
✅ **Live Location Tracking**: Uses browser geolocation + Leaflet maps  
✅ **Interactive Maps**: Full map interaction with zoom, pan, markers  

## Installation & Setup

### Backend
```bash
cd Backend
npm install
# No additional API keys needed
npm start
```

### Frontend
```bash
cd frontend
npm install
# Dependencies now include leaflet and react-leaflet
npm run dev
```

## API Usage Guidelines

### Nominatim Usage Policy
- Maximum 1 request per second
- Include a valid User-Agent header (already implemented)
- For heavy usage, consider setting up your own Nominatim server

### OpenStreetMap Tile Usage Policy
- Don't exceed reasonable usage limits
- For high-traffic applications, consider using alternative tile servers or setting up your own

## Alternative Free Services

If you need more advanced routing or higher rate limits, consider:

1. **Open Route Service (ORS)**: Free tier with API key
2. **MapBox**: Free tier with generous limits
3. **OSRM**: Self-hosted routing engine
4. **GraphHopper**: Free tier available

## Migration Benefits

- ✅ **No API Keys Required**: Zero configuration for maps
- ✅ **No Billing**: Completely free to use
- ✅ **No Rate Limits**: Only fair usage policies
- ✅ **Privacy Friendly**: No tracking by commercial map providers
- ✅ **Open Source**: Community-driven mapping data

## Limitations of Free Solution

- **Routing Quality**: Straight-line distance vs actual road routes
- **Traffic Data**: No real-time traffic information
- **Rate Limits**: Nominatim has usage policies (1 req/sec)
- **Geocoding Accuracy**: May be slightly less accurate than Google Maps in some regions

## Upgrading to Paid Services (Optional)

If you need more advanced features later, you can easily integrate:
- **MapBox** (generous free tier)
- **HERE Maps** (free tier available) 
- **Open Route Service** (free tier with registration)

The code is structured to make such migrations simple by updating only the service layer.