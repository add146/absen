import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Building2,
    Users,
    CreditCard,
    Settings,
    Activity,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Globe
} from 'lucide-react';

interface TenantStats {
    active_users: number;
    total_checkins: number;
    total_points: number;
}

interface SubscriptionInfo {
    id: string;
    plan_name: string;
    status: string;
    current_period_end: string;
    features: any;
}

interface TenantData {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan_type: string;
    trial_ends_at?: string;
    subdomain?: string;
}

const TenantDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [tenant, setTenant] = useState<TenantData | null>(null);
    const [stats, setStats] = useState<TenantStats | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Redirect non-owners to employee dashboard
        try {
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            if (userData && userData.role !== 'owner' && userData.role !== 'super_admin') {
                navigate('/dashboard', { replace: true });
                return;
            }
        } catch (e) {
            console.error('Error parsing user data', e);
        }

        fetchTenantData();
    }, []);

    const fetchTenantData = async () => {
        try {
            const res = await api.get('/tenants/current');
            setTenant(res.data.tenant);
            setStats(res.data.stats);
            setSubscription(res.data.subscription);
        } catch (err: any) {
            console.error('Failed to fetch tenant data', err);
            setError('Gagal memuat data tenant.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-8 w-8 text-primary" />
                        {tenant?.name}
                    </h1>
                    <p className="text-gray-500">
                        Manage your organization settings and subscription
                    </p>
                </div>
                <div className="flex gap-3">
                    {tenant?.status === 'trial' && (
                        <div className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg flex items-center gap-2 border border-yellow-200">
                            <Activity className="h-4 w-4" />
                            <span className="font-medium">Trial Mode</span>
                        </div>
                    )}
                    <Link
                        to="/subscription"
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <CreditCard className="h-4 w-4" />
                        Manage Subscription
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">Total Employees</h3>
                        <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.active_users || 0}</p>
                    <p className="text-sm text-gray-400 mt-2">Active users in your organization</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">Total Check-ins</h3>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.total_checkins || 0}</p>
                    <p className="text-sm text-gray-400 mt-2">All time attendance records</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">Total Points</h3>
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats?.total_points || 0}</p>
                    <p className="text-sm text-gray-400 mt-2">Points distributed to employees</p>
                </div>
            </div>

            {/* Current Plan & Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Subscription Status */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        Current Plan
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-500">Plan</p>
                                <p className="text-xl font-bold text-primary capitalize">{tenant?.plan_type}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${tenant?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {tenant?.status}
                            </div>
                        </div>

                        {tenant?.trial_ends_at && tenant.status === 'trial' && (
                            <div className="flex items-center gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-100">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-semibold">Trial Ends Soon</p>
                                    <p className="text-sm">Your free trial expires on {new Date(tenant.trial_ends_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )}

                        <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Plan Features</h4>
                            <ul className="space-y-2">
                                {subscription?.features && Object.entries(subscription.features).map(([key, value]) => (
                                    <li key={key} className="flex items-center text-sm text-gray-600">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                        <span className="ml-1 font-medium">{String(value)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Quick Actions / Configuration */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-gray-400" />
                        Configuration
                    </h2>

                    <div className="grid grid-cols-1 gap-4">
                        <Link to="/admin/settings" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors group">
                            <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">General Settings</h4>
                                <p className="text-sm text-gray-500">Update company profile and branding</p>
                            </div>
                        </Link>

                        <Link to="/tenant/custom-domain" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors group">
                            <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Globe className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Custom Domain</h4>
                                <p className="text-sm text-gray-500">Connect your own domain name</p>
                            </div>
                        </Link>

                        <Link to="/admin/employees" className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors group">
                            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Manage Users</h4>
                                <p className="text-sm text-gray-500">Add or remove employees</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantDashboard;
