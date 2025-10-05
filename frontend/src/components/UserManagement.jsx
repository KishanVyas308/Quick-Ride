import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAdmin } from '../context/AdminContext';

const UserManagement = () => {
    const { hasPermission } = useAdmin();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchTerm]);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/users`, {
                params: {
                    page: currentPage,
                    limit: 20,
                    search: searchTerm
                }
            });
            setUsers(response.data.users);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (userId, newStatus) => {
        try {
            await axios.patch(`${import.meta.env.VITE_BASE_URL}/admin/users/${userId}/status`, {
                status: newStatus
            });
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    };

    const viewUserDetails = async (userId) => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/users/${userId}`);
            setSelectedUser(response.data);
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };

    if (!hasPermission('view_users')) {
        return <div className="text-center text-red-600 p-8">You don't have permission to view users.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                            {users.map((user) => (
                                <li key={user._id} className="px-6 py-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-12 w-12">
                                                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                                                    <span className="text-white font-medium">
                                                        {user.fullname.firstname.charAt(0)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-lg font-medium text-gray-900">
                                                    {user.fullname.firstname} {user.fullname.lastname}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                                <div className="text-xs text-gray-400">
                                                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                user.status === 'active' ? 'bg-green-100 text-green-800' :
                                                user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {user.status || 'active'}
                                            </span>
                                            <button
                                                onClick={() => viewUserDetails(user._id)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                View Details
                                            </button>
                                            {hasPermission('manage_users') && (
                                                <select
                                                    onChange={(e) => handleStatusUpdate(user._id, e.target.value)}
                                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                                    defaultValue={user.status || 'active'}
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                    <option value="banned">Banned</option>
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

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">User Details</h3>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-900">
                                    {selectedUser.user.fullname.firstname} {selectedUser.user.fullname.lastname}
                                </h4>
                                <p className="text-gray-600">{selectedUser.user.email}</p>
                                <p className="text-sm text-gray-500">
                                    Member since: {new Date(selectedUser.user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            
                            <div>
                                <h5 className="font-medium text-gray-900 mb-2">Recent Rides ({selectedUser.rides.length})</h5>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {selectedUser.rides.map((ride) => (
                                        <div key={ride._id} className="border rounded p-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {ride.pickup} → {ride.destination}
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
                                    {selectedUser.rides.length === 0 && (
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

export default UserManagement;