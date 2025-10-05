# Quick Ride

Quick Ride is a full-stack ride-sharing application inspired by Uber, rebranded for a unique experience. It features real-time ride booking, OTP-based ride verification, dynamic fare calculation, and secure earnings management for both riders and captains.

## Features

### Core Features
- **User & Captain Authentication**: Secure signup/login for both roles
- **OTP Verification**: Riders receive an OTP for ride verification; captains must enter the correct OTP to start the ride
- **Dynamic Fare Calculation**: Fares are calculated based on distance and vehicle type
- **Earnings Management**: Captains can view real-time earnings; commission and bonus logic included
- **Real-Time Updates**: Socket.io for live ride status, driver tracking, and notifications
- **Map Integration**: Live tracking and route display using Leaflet
- **Resend OTP with Cooldown**: Riders can resend OTP with a cooldown to prevent abuse
- **Full Quick Ride Branding**: All UI and technical identifiers reflect "Quick Ride"

### Admin Features
- **Comprehensive Admin Panel**: Role-based access control with Super Admin, Admin, and Moderator roles
- **Dashboard Analytics**: Real-time statistics, system health monitoring, and activity feeds
- **User Management**: View, search, and manage user accounts with status controls
- **Captain Management**: Driver verification, performance tracking, and status management
- **Ride Management**: Real-time ride monitoring with emergency cancellation capabilities
- **Financial Reports**: Revenue analytics, commission tracking, and performance metrics
- **Security Features**: JWT authentication, permission-based access, and audit trails

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

#### For Users and Captains
- Open the frontend URL (usually `http://localhost:5173`) in your browser.
- Register as a user or captain and start booking or accepting rides!

#### For Administrators
1. **Create Admin Account**: Run `npm run seed-admin` in the backend directory to create the initial super admin
2. **Access Admin Panel**: Navigate to `/admin/login` from the main site
3. **Default Credentials**:
   - Email: `admin@quickride.com`
   - Password: `admin123456`
4. **Admin Features**:
   - Dashboard with real-time analytics
   - User and Captain management
   - Ride monitoring and control
   - Financial reports and insights

## Customization
- **Branding**: All Uber references have been replaced with "Quick Ride". Update logos and colors in `frontend/public/` and `frontend/src/` as needed.
- **Vehicle Types**: Edit `VehiclePanel.jsx` and related backend logic to add or modify vehicle types.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
