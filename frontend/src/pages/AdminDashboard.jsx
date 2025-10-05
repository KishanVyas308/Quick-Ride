import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import UserManagement from '../components/UserManagement';
import CaptainManagement from '../components/CaptainManagement';
import RideManagement from '../components/RideManagement';
import FinancialReports from '../components/FinancialReports';
import axios from 'axios';

const AdminDashboard = () => {
    const { admin, logoutAdmin, hasPermission } = useAdmin();
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!admin) {
            navigate('/admin/login');
            return;
        }
        fetchDashboardData();
    }, [admin, navigate]);

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/dashboard`);
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logoutAdmin();
        navigate('/admin/login');
    };

    const StatCard = ({ title, value, subtitle, color = 'blue', icon }) => (
        <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 border-${color}-500`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
                {icon && <div className={`text-${color}-500 text-2xl`}>{icon}</div>}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                                <span className="text-white font-bold">QR</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Quick Ride Admin</h1>
                                <p className="text-sm text-gray-600">Welcome, {admin?.fullname?.firstname}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">Role: {admin?.role}</span>
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {[
                            { key: 'overview', label: 'Overview', permission: 'view_analytics' },
                            { key: 'users', label: 'Users', permission: 'view_users' },
                            { key: 'captains', label: 'Captains', permission: 'view_captains' },
                            { key: 'rides', label: 'Rides', permission: 'view_rides' },
                         
                        ].map(tab => (
                            hasPermission(tab.permission) && (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === tab.key
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'overview' && dashboardData && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard
                                title="Total Users"
                                value={dashboardData.stats.users.total.toLocaleString()}
                                subtitle={`Growth: ${dashboardData.stats.users.growth}`}
                                color="blue"
                                icon="👥"
                            />
                            <StatCard
                                title="Total Captains"
                                value={dashboardData.stats.captains.total.toLocaleString()}
                                subtitle={`Active: ${dashboardData.stats.captains.active} (${dashboardData.stats.captains.activePercentage}%)`}
                                color="green"
                                icon="🚗"
                            />
                            <StatCard
                                title="Total Rides"
                                value={dashboardData.stats.rides.total.toLocaleString()}
                                subtitle={`Completion Rate: ${dashboardData.stats.rides.completionRate}%`}
                                color="purple"
                                icon="🛣️"
                            />
                            <StatCard
                                title="Revenue"
                                value={`₹${dashboardData.stats.revenue.total.toLocaleString()}`}
                                subtitle={`This Week: ₹${dashboardData.stats.revenue.thisWeek.toLocaleString()}`}
                                color="yellow"
                                icon="💰"
                            />
                        </div>

                        {/* Recent Activities */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Rides</h3>
                                <div className="space-y-3">
                                    {dashboardData.activities.rides.slice(0, 5).map((ride, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {ride.user?.fullname?.firstname} {ride.user?.fullname?.lastname}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {ride.pickup} → {ride.destination}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-medium ${
                                                    ride.status === 'completed' ? 'text-green-600' :
                                                    ride.status === 'ongoing' ? 'text-blue-600' :
                                                    ride.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                                                }`}>
                                                    {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                                                </p>
                                                <p className="text-sm text-gray-500">₹{ride.fare}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">System Status</span>
                                        <span className={`px-3 py-1 rounded-full text-sm ${
                                            dashboardData.systemHealth.status === 'healthy' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {dashboardData.systemHealth.status === 'healthy' ? '✅ Healthy' : '⚠️ Warning'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Server Uptime</span>
                                        <span className="font-medium">{dashboardData.systemHealth.serverUptime}h</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Active Connections</span>
                                        <span className="font-medium">{dashboardData.systemHealth.activeConnections}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Avg Response Time</span>
                                        <span className="font-medium">{dashboardData.systemHealth.avgResponseTime}ms</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && <UserManagement />}

                {activeTab === 'captains' && <CaptainManagement />}

                {activeTab === 'rides' && <RideManagement />}

                {activeTab === 'reports' && <FinancialReports />}
            </main>
        </div>
    );
};

export default AdminDashboard;