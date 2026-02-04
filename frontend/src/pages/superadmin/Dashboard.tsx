import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdBusiness, MdPeople, MdAttachMoney, MdTrendingUp } from 'react-icons/md';

const SuperAdminDashboard: React.FC = () => {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
        // Real-time updates: Poll every 30 seconds
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAnalytics = async () => {
        try {
            // Don't set loading on background updates
            if (!analytics) setLoading(true);
            const res = await api.get('/super-admin/analytics');
            setAnalytics(res.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-8" role="status" aria-live="polite">Memuat analitik platform...</div>;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Ringkasan Platform</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={<MdBusiness className="text-3xl text-blue-600" aria-hidden="true" />}
                    label="Total Penyewa"
                    value={analytics?.tenantStats?.reduce((sum: number, s: any) => sum + (s.count || 0), 0) || 0}
                    bgColor="bg-blue-50"
                />
                <StatCard
                    icon={<MdPeople className="text-3xl text-green-600" aria-hidden="true" />}
                    label="Total Pengguna"
                    value={analytics?.totalUsers || 0}
                    bgColor="bg-green-50"
                />
                <StatCard
                    icon={<MdAttachMoney className="text-3xl text-purple-600" aria-hidden="true" />}
                    label="Pendapatan Bulanan (MRR)"
                    value={formatCurrency(analytics?.mrr || 0)}
                    bgColor="bg-purple-50"
                />
                <StatCard
                    icon={<MdTrendingUp className="text-3xl text-orange-600" aria-hidden="true" />}
                    label="Pendaftar Baru (30h)"
                    value={analytics?.recentSignups || 0}
                    bgColor="bg-orange-50"
                />
            </div>

            {/* Tenant Status Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Status Penyewa</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analytics?.tenantStats?.map((stat: any) => (
                        <div key={stat.status} className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-800">{stat.count}</div>
                            <div className="text-sm text-gray-500 capitalize">{stat.status}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, bgColor }: any) => (
    <div className={`${bgColor} p-6 rounded-lg border border-gray-200`}>
        <div className="flex items-center gap-4">
            <div>{icon}</div>
            <div>
                <div className="text-2xl font-bold text-gray-800">{value}</div>
                <div className="text-sm text-gray-600">{label}</div>
            </div>
        </div>
    </div>
);

export default SuperAdminDashboard;
