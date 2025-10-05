import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAdmin } from '../context/AdminContext';

const CaptainManagement = () => {
    const { hasPermission } = useAdmin();
    const [captains, setCaptains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [verifiedFilter, setVerifiedFilter] = useState('');
    const [selectedCaptain, setSelectedCaptain] = useState(null);

    useEffect(() => {
        fetchCaptains();
    }, [currentPage, searchTerm, statusFilter, verifiedFilter]);

    const fetchCaptains = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/captains`, {
                params: {
                    page: currentPage,
                    limit: 20,
                    search: searchTerm,
                    status: statusFilter,
                    verified: verifiedFilter
                }
            });
            setCaptains(response.data.captains);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Error fetching captains:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (captainId, newStatus) => {
        try {
            await axios.patch(`${import.meta.env.VITE_BASE_URL}/admin/captains/${captainId}/status`, {
                status: newStatus
            });
            fetchCaptains();
        } catch (error) {
            console.error('Error updating captain status:', error);
        }
    };

    const handleVerificationUpdate = async (captainId, isVerified) => {
        try {
            await axios.patch(`${import.meta.env.VITE_BASE_URL}/admin/captains/${captainId}/verify`, {
                isVerified: isVerified
            });
            fetchCaptains();
        } catch (error) {
            console.error('Error updating captain verification:', error);
        }
    };

    const viewCaptainDetails = async (captainId) => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/captains/${captainId}`);
            setSelectedCaptain(response.data);
        } catch (error) {
            console.error('Error fetching captain details:', error);
        }
    };

    if (!hasPermission('view_captains')) {
        return <div className="text-center text-red-600 p-8">You don't have permission to view captains.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Captain Management</h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        placeholder="Search captains..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <select
                        value={verifiedFilter}
                        onChange={(e) => setVerifiedFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Verification</option>
                        <option value="true">Verified</option>
                        <option value="false">Not Verified</option>
                    </select>
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
                            {captains.map((captain) => (
                                <li key={captain._id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-12 w-12">
                                                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                                                    <span className="text-white font-medium">
                                                        {captain.fullname.firstname.charAt(0)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-lg font-medium text-gray-900">
                                                    {captain.fullname.firstname} {captain.fullname.lastname}
                                                </div>
                                                <div className="text-sm text-gray-500">{captain.email}</div>
                                                <div className="text-xs text-gray-400">
                                                    {captain.vehicle.vehicleType} • {captain.vehicle.plate} • {captain.city}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Joined: {new Date(captain.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                captain.verification?.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {captain.verification?.isVerified ? 'Verified' : 'Not Verified'}
                                            </span>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                captain.status === 'active' ? 'bg-green-100 text-green-800' :
                                                captain.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {captain.status}
                                            </span>
                                            <button
                                                onClick={() => viewCaptainDetails(captain._id)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                View Details
                                            </button>
                                            {hasPermission('verify_captains') && (
                                                <button
                                                    onClick={() => handleVerificationUpdate(captain._id, !captain.verification?.isVerified)}
                                                    className={`text-sm px-2 py-1 rounded ${
                                                        captain.verification?.isVerified 
                                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                                >
                                                    {captain.verification?.isVerified ? 'Unverify' : 'Verify'}
                                                </button>
                                            )}
                                            {hasPermission('manage_captains') && (
                                                <select
                                                    onChange={(e) => handleStatusUpdate(captain._id, e.target.value)}
                                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                                    defaultValue={captain.status}
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                    <option value="suspended">Suspended</option>
                                                </select>
                                            )}
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

            {/* Captain Details Modal */}
            {selectedCaptain && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Captain Details</h3>
                            <button
                                onClick={() => setSelectedCaptain(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Personal Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Name:</strong> {selectedCaptain.captain.fullname.firstname} {selectedCaptain.captain.fullname.lastname}</p>
                                        <p><strong>Email:</strong> {selectedCaptain.captain.email}</p>
                                        <p><strong>Status:</strong> {selectedCaptain.captain.status}</p>
                                        <p><strong>Verified:</strong> {selectedCaptain.captain.verification?.isVerified ? 'Yes' : 'No'}</p>
                                        <p><strong>City:</strong> {selectedCaptain.captain.city}</p>
                                        <p><strong>Member since:</strong> {new Date(selectedCaptain.captain.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Vehicle Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Type:</strong> {selectedCaptain.captain.vehicle.vehicleType}</p>
                                        <p><strong>Plate:</strong> {selectedCaptain.captain.vehicle.plate}</p>
                                        <p><strong>Color:</strong> {selectedCaptain.captain.vehicle.color}</p>
                                        <p><strong>Capacity:</strong> {selectedCaptain.captain.vehicle.capacity} seats</p>
                                    </div>
                                </div>
                            </div>

                            {selectedCaptain.captain.statistics && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="bg-blue-50 p-3 rounded">
                                            <p className="font-medium">Total Rides</p>
                                            <p className="text-xl font-bold text-blue-600">
                                                {selectedCaptain.captain.statistics?.totalRides || 0}
                                            </p>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded">
                                            <p className="font-medium">Completed</p>
                                            <p className="text-xl font-bold text-green-600">
                                                {selectedCaptain.captain.statistics?.completedRides || 0}
                                            </p>
                                        </div>
                                        <div className="bg-yellow-50 p-3 rounded">
                                            <p className="font-medium">Total Earnings</p>
                                            <p className="text-xl font-bold text-yellow-600">
                                                ₹{selectedCaptain.captain.earnings?.totalEarned || 0}
                                            </p>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded">
                                            <p className="font-medium">Rating</p>
                                            <p className="text-xl font-bold text-purple-600">
                                                {selectedCaptain.captain.statistics?.averageRating || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <h5 className="font-medium text-gray-900 mb-2">Recent Rides ({selectedCaptain.rides.length})</h5>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {selectedCaptain.rides.map((ride) => (
                                        <div key={ride._id} className="border rounded p-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {ride.pickup} → {ride.destination}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Passenger: {ride.user?.fullname?.firstname} {ride.user?.fullname?.lastname}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(ride.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-medium ${
                                                        ride.status === 'completed' ? 'text-green-600' :
                                                        ride.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'
                                                    }`}>
                                                        {ride.status}
                                                    </p>
                                                    <p className="text-sm text-gray-600">₹{ride.fare}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedCaptain.rides.length === 0 && (
                                        <p className="text-gray-500 text-center py-4">No rides found</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaptainManagement;