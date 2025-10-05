import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { loginAdmin } = useAdmin();
    const navigate = useNavigate();

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await loginAdmin(email, password);

        if (result.success) {
            navigate('/admin/dashboard');
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className='p-7 h-screen flex flex-col justify-between'>
            <div>
                <div className="flex items-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-xl">QR</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Quick Ride</h1>
                        <p className="text-sm text-gray-600">Admin Panel</p>
                    </div>
                </div>

                <form onSubmit={submitHandler}>
                    <h3 className='text-lg font-medium mb-2'>Admin Login</h3>
                    
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <div className='mb-4'>
                        <label className='text-sm font-medium text-gray-700 block mb-2'>Email</label>
                        <input
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className='bg-[#eeeeee] mb-3 rounded px-4 py-2 border w-full text-lg placeholder:text-base'
                            type="email"
                            placeholder='email@example.com'
                        />
                    </div>

                    <div className='mb-6'>
                        <label className='text-sm font-medium text-gray-700 block mb-2'>Password</label>
                        <input
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className='bg-[#eeeeee] mb-3 rounded px-4 py-2 border w-full text-lg placeholder:text-base'
                            type="password"
                            placeholder='password'
                        />
                    </div>

                    <button
                        disabled={loading}
                        className={`${
                            loading ? 'bg-gray-400' : 'bg-[#111] hover:bg-gray-800'
                        } text-white font-semibold mb-3 rounded px-4 py-2 w-full text-lg transition-colors`}
                    >
                        {loading ? 'Logging in...' : 'Login as Admin'}
                    </button>
                </form>

                <div className="text-center mt-6 text-sm text-gray-600">
                    <p>Demo Credentials:</p>
                    <p>Email: admin@quickride.com</p>
                    <p>Password: admin123456</p>
                </div>
            </div>

            <div>
                <Link 
                    to='/' 
                    className='bg-[#d5622d] flex items-center justify-center text-white font-semibold mb-5 rounded px-4 py-2 w-full text-lg'
                >
                    Back to Main Site
                </Link>
            </div>
        </div>
    );
};

export default AdminLogin;