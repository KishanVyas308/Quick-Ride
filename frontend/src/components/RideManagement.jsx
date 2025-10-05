import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAdmin } from '../context/AdminContext';

const RideManagement = () => {
    const { hasPermission } = useAdmin();
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRide, setSelectedRide] = useState(null);

    useEffect(() => {
        fetchRides();
    }, [currentPage, statusFilter, startDate, endDate]);

    const fetchRides = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/rides`, {
                params: {
                    page: currentPage,
                    limit: 20,
                    status: statusFilter,
                    startDate,
                    endDate
                }
            });
            setRides(response.data.rides);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Error fetching rides:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRide = async (rideId, reason) => {
        try {
            await axios.patch(`${import.meta.env.VITE_BASE_URL}/admin/rides/${rideId}/cancel`, {
                reason: reason || 'Cancelled by admin'
            });
            fetchRides();
            setSelectedRide(null);
        } catch (error) {
            console.error('Error cancelling ride:', error);
        }
    };

    const viewRideDetails = async (rideId) => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/rides/${rideId}`);
            setSelectedRide(response.data.ride);
        } catch (error) {
            console.error('Error fetching ride details:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'ongoing': return 'bg-blue-100 text-blue-800';
            case 'accepted': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (!hasPermission('view_rides')) {
        return <div className="text-center text-red-600 p-8">You don't have permission to view rides.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Ride Management</h2>
                <div className="flex items-center space-x-4">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {rides.map((ride) => (
                                <li key={ride._id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="text-lg font-medium text-gray-900">
                                                    Ride #{ride._id.slice(-6)}
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ride.status)}`}>
                                                    {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                                                </span>
                                            </div>
                                            
                                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Passenger</p>
                                                    <p className="font-medium">
                                                        {ride.user?.fullname?.firstname} {ride.user?.fullname?.lastname}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{ride.user?.email}</p>
                                                </div>
                                                
                                                <div>
                                                    <p className="text-sm text-gray-600">Driver</p>
                                                    {ride.captain ? (
                                                        <>
                                                            <p className="font-medium">
                                                                {ride.captain.fullname?.firstname} {ride.captain.fullname?.lastname}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {ride.captain.vehicle?.plate} • {ride.captain.vehicle?.vehicleType}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <p className="text-gray-500">Not assigned</p>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <p className="text-sm text-gray-600">Route & Fare</p>
                                                    <p className="font-medium text-sm">
                                                        {ride.pickup} → {ride.destination}
                                                    </p>
                                                    <p className="text-lg font-bold text-green-600">₹{ride.fare}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="text-xs text-gray-500">
                                                    Created: {new Date(ride.createdAt).toLocaleString()}
                                                    {ride.vehicleType && <span> • Vehicle: {ride.vehicleType}</span>}
                                                    {ride.city && <span> • City: {ride.city}</span>}
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => viewRideDetails(ride._id)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                    >
                                                        View Details
                                                    </button>
                                                    
                                                    {hasPermission('manage_rides') && ['pending', 'accepted', 'ongoing'].includes(ride.status) && (
                                                        <button
                                                            onClick={() => handleCancelRide(ride._id, 'Cancelled by admin')}
                                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                        >
                                                            Cancel Ride
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing page {currentPage} of {totalPages}
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Ride Details Modal */}
            {selectedRide && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Ride Details - #{selectedRide._id.slice(-6)}</h3>
                            <button
                                onClick={() => setSelectedRide(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Ride Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>Status:</strong> 
                                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedRide.status)}`}>
                                                    {selectedRide.status.charAt(0).toUpperCase() + selectedRide.status.slice(1)}
                                                </span>
                                            </p>
                                            <p><strong>Fare:</strong> ₹{selectedRide.fare}</p>
                                            <p><strong>Vehicle Type:</strong> {selectedRide.vehicleType}</p>
                                            <p><strong>City:</strong> {selectedRide.city}</p>
                                            <p><strong>Created:</strong> {new Date(selectedRide.createdAt).toLocaleString()}</p>
                                            {selectedRide.updatedAt && selectedRide.updatedAt !== selectedRide.createdAt && (
                                                <p><strong>Last Updated:</strong> {new Date(selectedRide.updatedAt).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Route Details</h4>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>Pickup:</strong> {selectedRide.pickup}</p>
                                            <p><strong>Destination:</strong> {selectedRide.destination}</p>
                                            {selectedRide.distance && <p><strong>Distance:</strong> {selectedRide.distance} km</p>}
                                            {selectedRide.duration && <p><strong>Duration:</strong> {selectedRide.duration} min</p>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Passenger Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>Name:</strong> {selectedRide.user?.fullname?.firstname} {selectedRide.user?.fullname?.lastname}</p>
                                            <p><strong>Email:</strong> {selectedRide.user?.email}</p>
                                        </div>
                                    </div>
                                    
                                    {selectedRide.captain && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Driver Information</h4>
                                            <div className="space-y-2 text-sm">
                                                <p><strong>Name:</strong> {selectedRide.captain.fullname?.firstname} {selectedRide.captain.fullname?.lastname}</p>
                                                <p><strong>Email:</strong> {selectedRide.captain.email}</p>
                                                <p><strong>Vehicle:</strong> {selectedRide.captain.vehicle?.color} {selectedRide.captain.vehicle?.vehicleType}</p>
                                                <p><strong>Plate:</strong> {selectedRide.captain.vehicle?.plate}</p>
                                                <p><strong>Capacity:</strong> {selectedRide.captain.vehicle?.capacity} seats</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {selectedRide.otp && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Security Information</h4>
                                    <div className="bg-gray-50 p-3 rounded text-sm">
                                        <p><strong>OTP:</strong> {selectedRide.otp}</p>
                                    </div>
                                </div>
                            )}
                            
                            {hasPermission('manage_rides') && ['pending', 'accepted', 'ongoing'].includes(selectedRide.status) && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Admin Actions</h4>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to cancel this ride?')) {
                                                handleCancelRide(selectedRide._id, 'Cancelled by admin');
                                            }
                                        }}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
                                    >
                                        Cancel Ride
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RideManagement;