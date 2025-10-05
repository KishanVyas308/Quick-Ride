import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const AdminProtectWrapper = ({ children }) => {
    const { admin, isLoading } = useAdmin();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (admin) {
        return children;
    } else {
        return <Navigate to="/admin/login" />;
    }
};

export default AdminProtectWrapper;