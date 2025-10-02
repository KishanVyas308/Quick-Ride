# Quick Ride

Quick Ride is a full-stack ride-sharing application inspired by Uber, rebranded for a unique experience. It features real-time ride booking, OTP-based ride verification, dynamic fare calculation, and secure earnings management for both riders and captains.

## Features

- **User & Captain Authentication**: Secure signup/login for both roles
- **OTP Verification**: Riders receive an OTP for ride verification; captains must enter the correct OTP to start the ride
- **Dynamic Fare Calculation**: Fares are calculated based on distance and vehicle type
- **Earnings Management**: Captains can view real-time earnings; commission and bonus logic included
- **Real-Time Updates**: Socket.io for live ride status, driver tracking, and notifications
- **Map Integration**: Live tracking and route display using Leaflet
- **Resend OTP with Cooldown**: Riders can resend OTP with a cooldown to prevent abuse
- **Full Quick Ride Branding**: All UI and technical identifiers reflect "Quick Ride"

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Socket.io-client, Leaflet
- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Other**: Axios, JWT, bcrypt, dotenv

## Project Structure

```
Backend/
  app.js
  server.js
  ...
frontend/
  src/
    App.jsx
    components/
    pages/
    ...
```

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB

### Backend Setup
1. Navigate to the backend folder:
   ```sh
   cd Backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file based on `.env.example` and set your MongoDB URI and JWT secret.
4. Start the backend server:
   ```sh
   node server.js
   ```

### Frontend Setup
1. Navigate to the frontend folder:
   ```sh
   cd frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the frontend dev server:
   ```sh
   npm run dev
   ```

### Usage
- Open the frontend URL (usually `http://localhost:5173`) in your browser.
- Register as a user or captain and start booking or accepting rides!

## Customization
- **Branding**: All Uber references have been replaced with "Quick Ride". Update logos and colors in `frontend/public/` and `frontend/src/` as needed.
- **Vehicle Types**: Edit `VehiclePanel.jsx` and related backend logic to add or modify vehicle types.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
