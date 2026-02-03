import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AttendanceTrendChart from '../../components/charts/AttendanceTrendChart';
import PunctualityChart from '../../components/charts/PunctualityChart';
import PointsDistributionChart from '../../components/charts/PointsDistributionChart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const AnalyticsDashboard: React.FC = () => {
    const [attendanceTrend, setAttendanceTrend] = useState([]);
    const [punctuality, setPunctuality] = useState([]);
    const [pointsDistribution, setPointsDistribution] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [trendRes, punctRes, pointsRes] = await Promise.all([
                axios.get(`${API_URL}/analytics/attendance-trend?days=30`, { headers }),
                axios.get(`${API_URL}/analytics/punctuality`, { headers }),
                axios.get(`${API_URL}/analytics/points-distribution`, { headers })
            ]);

            setAttendanceTrend(trendRes.data.data || []);
            setPunctuality(punctRes.data.data || []);
            setPointsDistribution(pointsRes.data.data || []);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-2">Comprehensive insights and trends</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                    <AttendanceTrendChart data={attendanceTrend} />
                </div>

                <PunctualityChart data={punctuality} />

                <PointsDistributionChart data={pointsDistribution} />
            </div>

            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            Analytics are updated in real-time. Use the date filters to view historical data.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
