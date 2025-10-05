import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAdmin } from '../context/AdminContext';

const FinancialReports = () => {
    const { hasPermission } = useAdmin();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');

    useEffect(() => {
        fetchFinancialReport();
    }, [period]);

    const fetchFinancialReport = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/reports/financial`, {
                params: { period }
            });
            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching financial report:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!hasPermission('financial_reports')) {
        return <div className="text-center text-red-600 p-8">You don't have permission to view financial reports.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="day">Last 24 Hours</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">Last Year</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : reportData ? (
                <>
                    {/* Revenue Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-3xl font-bold text-gray-900">₹{reportData.totalRevenue.toLocaleString()}</p>
                                <p className="text-sm text-gray-500">Period: {reportData.period}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Commission Earned</p>
                                <p className="text-3xl font-bold text-gray-900">₹{reportData.commissionEarned.toLocaleString()}</p>
                                <p className="text-sm text-gray-500">20% of total revenue</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Driver Earnings</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    ₹{(reportData.totalRevenue - reportData.commissionEarned).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500">80% of total revenue</p>
                            </div>
                        </div>
                    </div>

                    {/* Rides by Vehicle Type */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Vehicle Type</h3>
                        {reportData.ridesByVehicle && reportData.ridesByVehicle.length > 0 ? (
                            <div className="space-y-4">
                                {reportData.ridesByVehicle.map((vehicle, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                                        <div>
                                            <p className="font-medium text-gray-900 capitalize">{vehicle._id}</p>
                                            <p className="text-sm text-gray-600">{vehicle.count} rides</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-gray-900">₹{vehicle.revenue.toLocaleString()}</p>
                                            <p className="text-sm text-gray-500">
                                                Avg: ₹{Math.round(vehicle.revenue / vehicle.count)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No data available for this period</p>
                        )}
                    </div>

                    {/* Daily Revenue Trend */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Trend</h3>
                        {reportData.dailyRevenue && reportData.dailyRevenue.length > 0 ? (
                            <div className="space-y-2">
                                {reportData.dailyRevenue.map((day, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                                        <div>
                                            <p className="font-medium text-gray-900">{day._id}</p>
                                            <p className="text-sm text-gray-600">{day.rides} rides</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-900">₹{day.revenue.toLocaleString()}</p>
                                            <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                                                <div 
                                                    className="bg-blue-500 h-2 rounded-full" 
                                                    style={{ 
                                                        width: `${(day.revenue / Math.max(...reportData.dailyRevenue.map(d => d.revenue))) * 100}%` 
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No data available for this period</p>
                        )}
                    </div>

                    {/* Summary Statistics */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded">
                                <p className="text-2xl font-bold text-blue-600">
                                    {reportData.dailyRevenue ? reportData.dailyRevenue.reduce((acc, day) => acc + day.rides, 0) : 0}
                                </p>
                                <p className="text-sm text-gray-600">Total Rides</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded">
                                <p className="text-2xl font-bold text-green-600">
                                    ₹{reportData.dailyRevenue && reportData.dailyRevenue.length > 0 
                                        ? Math.round(reportData.totalRevenue / reportData.dailyRevenue.reduce((acc, day) => acc + day.rides, 0)) 
                                        : 0}
                                </p>
                                <p className="text-sm text-gray-600">Avg. Fare</p>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded">
                                <p className="text-2xl font-bold text-yellow-600">
                                    ₹{reportData.dailyRevenue && reportData.dailyRevenue.length > 0 
                                        ? Math.round(reportData.totalRevenue / reportData.dailyRevenue.length) 
                                        : 0}
                                </p>
                                <p className="text-sm text-gray-600">Daily Avg. Revenue</p>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded">
                                <p className="text-2xl font-bold text-purple-600">
                                    {reportData.ridesByVehicle ? reportData.ridesByVehicle.length : 0}
                                </p>
                                <p className="text-sm text-gray-600">Vehicle Types</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-600 p-8">No data available for the selected period.</div>
            )}
        </div>
    );
};

export default FinancialReports;