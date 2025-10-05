# Quick Ride Admin System

## Overview
A comprehensive admin panel has been added to the Quick Ride application with role-based access control, dashboard analytics, and full CRUD operations for managing users, captains, and rides.

## Admin Features Implemented

### 1. Authentication & Authorization
- **Admin Login/Logout**: Secure authentication with JWT tokens
- **Role-based Access**: Super Admin, Admin, and Moderator roles
- **Permission System**: Granular permissions for different operations
- **Protected Routes**: Admin-only access to sensitive operations

### 2. Dashboard Analytics
- **Real-time Statistics**: Users, Captains, Rides, Revenue metrics
- **System Health Monitoring**: Server uptime, response times, error tracking
- **Recent Activity Feed**: Latest rides, new users, and captain registrations
- **Visual Metrics**: Interactive charts and progress indicators

### 3. User Management
- **User Listing**: Paginated view with search functionality
- **User Details**: Complete profile with ride history
- **Status Management**: Active, Inactive, Banned status control
- **Search & Filter**: Find users by name, email, or status

### 4. Captain Management
- **Captain Listing**: Comprehensive driver database
- **Verification System**: Approve/reject captain applications
- **Vehicle Information**: Complete vehicle and license details
- **Performance Metrics**: Rides completed, earnings, ratings
- **Status Control**: Active, Inactive, Suspended management

### 5. Ride Management
- **Ride Monitoring**: Real-time ride tracking and status
- **Ride Details**: Complete ride information including OTP
- **Admin Cancellation**: Emergency ride cancellation capability
- **Date Range Filtering**: Historical ride analysis
- **Status Filtering**: Filter by pending, ongoing, completed, cancelled

### 6. Financial Reports
- **Revenue Analytics**: Total revenue, commission tracking
- **Vehicle Type Analysis**: Performance by car, bike, auto
- **Daily Trends**: Revenue patterns and growth metrics
- **Commission Reports**: Platform earnings vs driver payouts

## API Endpoints

### Admin Authentication
```
POST /admin/register - Create new admin (Super Admin only)
POST /admin/login - Admin login
GET /admin/profile - Get admin profile
GET /admin/logout - Admin logout
```

### Dashboard
```
GET /admin/dashboard - Get dashboard statistics and analytics
```

### User Management
```
GET /admin/users - List all users with pagination
GET /admin/users/:userId - Get user details with ride history
PATCH /admin/users/:userId/status - Update user status
```

### Captain Management
```
GET /admin/captains - List all captains with filters
GET /admin/captains/:captainId - Get captain details
PATCH /admin/captains/:captainId/status - Update captain status
PATCH /admin/captains/:captainId/verify - Verify/unverify captain
```

### Ride Management
```
GET /admin/rides - List all rides with filters
GET /admin/rides/:rideId - Get ride details
PATCH /admin/rides/:rideId/cancel - Cancel ride with reason
```

### Financial Reports
```
GET /admin/reports/financial?period=month - Get financial reports
```

## Permission System

### Super Admin Permissions
- All system permissions
- Manage other admins
- System settings access
- Financial reports access

### Admin Permissions
- View and manage users
- View and manage captains
- Verify captains
- View and manage rides
- View analytics
- Access financial reports

### Moderator Permissions
- View users, captains, rides
- View basic analytics
- Read-only access

## Security Features

### Authentication
- JWT token-based authentication
- Token blacklisting on logout
- Role-based route protection
- Permission-based feature access

### Data Protection
- Admin-only endpoints
- Input validation and sanitization
- Secure password hashing
- Protected sensitive information

## Admin Account Setup

### Default Super Admin
```
Email: admin@quickride.com
Password: admin123456
Role: super_admin
```

### Creating Additional Admins
Super Admins can create new admin accounts through the admin panel or API.

## Database Models

### Admin Model
```javascript
{
  fullname: { firstname, lastname },
  email: String (unique),
  password: String (hashed),
  role: ['super_admin', 'admin', 'moderator'],
  permissions: [Array of permission strings],
  status: ['active', 'inactive', 'suspended'],
  department: ['operations', 'customer_support', 'finance', 'technical', 'management'],
  lastLogin: Date,
  loginHistory: [{ timestamp, ipAddress, userAgent }]
}
```

## Frontend Components

### Main Pages
- `AdminLogin.jsx` - Admin authentication page
- `AdminDashboard.jsx` - Main admin dashboard with tabs
- `AdminProtectWrapper.jsx` - Route protection component

### Management Components
- `UserManagement.jsx` - User CRUD operations
- `CaptainManagement.jsx` - Captain management interface
- `RideManagement.jsx` - Ride monitoring and control
- `FinancialReports.jsx` - Revenue and analytics reports

### Context
- `AdminContext.jsx` - Global admin state management

## Usage Instructions

### Access Admin Panel
1. Visit `/admin/login` from the main application
2. Login with admin credentials
3. Access different sections through the navigation tabs

### Managing Users
- View all users in the Users tab
- Search by name or email
- Update user status (Active/Inactive/Banned)
- View detailed user profiles and ride history

### Managing Captains
- Monitor captain applications
- Verify driver documents and vehicles
- Control captain status and permissions
- Review performance metrics

### Monitoring Rides
- Real-time ride tracking
- Emergency cancellation capability
- Historical ride analysis
- OTP and security monitoring

### Financial Analysis
- Revenue tracking and trends
- Commission calculations
- Vehicle type performance
- Daily/weekly/monthly reports

## Security Considerations

### Best Practices Implemented
- Secure JWT token management
- Role-based access control
- Input validation on all endpoints
- Protected admin routes
- Audit trail for admin actions

### Recommended Enhancements
- Two-factor authentication for admins
- IP whitelisting for admin access
- Detailed audit logging
- Automated security monitoring
- Regular security audits

## Future Enhancements

### Additional Features
- Push notifications for admin alerts
- Advanced analytics with charts
- Bulk operations for user/captain management
- Automated reporting and scheduling
- Integration with external payment systems
- Customer support ticket system
- Fraud detection and prevention
- Mobile admin app

### Performance Optimizations
- Database indexing for faster queries
- Caching for frequently accessed data
- Real-time updates with WebSockets
- Pagination optimization
- Export functionality for reports

## Monitoring & Maintenance

### Health Checks
- System uptime monitoring
- Database connection health
- API response time tracking
- Error rate monitoring

### Regular Tasks
- User activity analysis
- Revenue reconciliation
- Performance optimization
- Security updates
- Backup verification