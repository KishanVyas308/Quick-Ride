import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AdminContext = createContext();

export const useAdmin = () => {
    return useContext(AdminContext);
};

const AdminProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('admin-token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            getAdminProfile();
        } else {
            setIsLoading(false);
        }
    }, []);

    const getAdminProfile = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/profile`);
            if (response.status === 200) {
                setAdmin(response.data.admin);
            }
        } catch (error) {
            console.error('Error fetching admin profile:', error);
            localStorage.removeItem('admin-token');
            delete axios.defaults.headers.common['Authorization'];
        } finally {
            setIsLoading(false);
        }
    };

    const loginAdmin = async (email, password) => {
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/admin/login`, {
                email,
                password
            });

            if (response.status === 200) {
                const { token, admin } = response.data;
                localStorage.setItem('admin-token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setAdmin(admin);
                return { success: true, admin };
            }
        } catch (error) {
            console.error('Admin login error:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || 'Login failed' 
            };
        }
    };

    const logoutAdmin = async () => {
        try {
            await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/logout`);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('admin-token');
            delete axios.defaults.headers.common['Authorization'];
            setAdmin(null);
        }
    };

    const hasPermission = (permission) => {
        if (!admin) return false;
        return admin.permissions?.includes(permission) || admin.role === 'super_admin';
    };

    const value = {
        admin,
        isLoading,
        loginAdmin,
        logoutAdmin,
        hasPermission,
        getAdminProfile
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};

export default AdminProvider;