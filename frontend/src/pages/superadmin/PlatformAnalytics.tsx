import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdTrendingUp, MdAttachMoney, MdPeople, MdBusiness } from 'react-icons/md';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PlatformAnalytics: React.FC = () => {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/super-admin/analytics');
            setAnalytics(res.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-8">Memuat analitik...</div>;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Tenant status pie chart data
    const tenantStatusData = analytics?.tenantStats?.map((stat: any) => ({
        name: stat.status,
        value: stat.count
    })) || [];

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

    const growthData = analytics?.growth?.map((val: any) => ({
        ...val,
        month: new Date(val.month + '-01').toLocaleDateString('en-US', { month: 'short' })
    })) || [];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Analitik Platform</h1>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    icon={<MdBusiness className="text-3xl text-blue-600" />}
                    label="Total Penyewa"
                    value={tenantStatusData.reduce((sum: number, item: any) => sum + item.value, 0)}
                    trend="+12%"
                    bgColor="bg-blue-50"
                />
                <MetricCard
                    icon={<MdPeople className="text-3xl text-green-600" />}
                    label="Total Pengguna"
                    value={analytics?.totalUsers || 0}
                    trend="+8%"
                    bgColor="bg-green-50"
                />
                <MetricCard
                    icon={<MdAttachMoney className="text-3xl text-purple-600" />}
                    label="Pendapatan Bulanan"
                    value={formatCurrency(analytics?.mrr || 0)}
                    trend="+15%"
                    bgColor="bg-purple-50"
                />
                <MetricCard
                    icon={<MdTrendingUp className="text-3xl text-orange-600" />}
                    label="Tingkat Pertumbuhan"
                    value="24%"
                    trend="+5%"
                    bgColor="bg-orange-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Tenant Growth Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold mb-4">Pertumbuhan Penyewa</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={growthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="tenants" stroke="#3b82f6" strokeWidth={2} name="Penyewa" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* User Growth Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold mb-4">Pertumbuhan Pengguna</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={growthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} name="Pengguna" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Revenue Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold mb-4">Tren Pendapatan</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={growthData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Bar dataKey="revenue" fill="#8b5cf6" name="Pendapatan (IDR)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Tenant Status Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold mb-4">Distribusi Status Penyewa</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={tenantStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {tenantStatusData.map((_entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Tenants Table */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Penyewa Berkinerja Terbaik</h2>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penyewa</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pengguna</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRR</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium">Tenant {i}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                        Premium
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{50 * i}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                        Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-semibold">
                                    {formatCurrency(500000 * i)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MetricCard = ({ icon, label, value, trend, bgColor }: any) => (
    <div className={`${bgColor} p-6 rounded-lg border border-gray-200`}>
        <div className="flex items-center gap-4">
            <div>{icon}</div>
            <div className="flex-1">
                <div className="text-2xl font-bold text-gray-800">{value}</div>
                <div className="text-sm text-gray-600">{label}</div>
                <div className="text-xs text-green-600 font-semibold mt-1">{trend} from last month</div>
            </div>
        </div>
    </div>
);

export default PlatformAnalytics;
