import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdAdd, MdEdit, MdBusiness, MdBlock } from 'react-icons/md';

const TenantManagement: React.FC = () => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        status: 'trial',
        plan_type: 'free',
        max_users: 5
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/super-admin/tenants');
            setTenants(res.data.data);
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingTenant(null);
        setFormData({
            name: '',
            slug: '',
            status: 'trial',
            plan_type: 'free',
            max_users: 5
        });
        setShowModal(true);
    };

    const handleEdit = (tenant: any) => {
        setEditingTenant(tenant);
        setFormData({
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            plan_type: tenant.plan_type,
            max_users: tenant.max_users
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingTenant) {
                await api.put(`/super-admin/tenants/${editingTenant.id}`, formData);
                setMessage('Tenant updated successfully');
            } else {
                await api.post('/super-admin/tenants', formData);
                setMessage('Tenant created successfully');
            }
            setShowModal(false);
            fetchTenants();
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Failed to save tenant');
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSuspend = async (id: string) => {
        if (!confirm('Suspend this tenant? Users will not be able to login.')) return;

        try {
            await api.delete(`/super-admin/tenants/${id}`);
            setMessage('Tenant suspended');
            fetchTenants();
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Failed to suspend tenant');
        }
        setTimeout(() => setMessage(''), 3000);
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Tenant Management</h1>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    <MdAdd />
                    Create Tenant
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tenants.map(tenant => (
                    <div key={tenant.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <MdBusiness className="text-2xl text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{tenant.name}</h3>
                                    <p className="text-sm text-gray-500">@{tenant.slug}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                                tenant.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                                    tenant.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                {tenant.status}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Plan:</span>
                                <span className="font-semibold capitalize">{tenant.plan_type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Max Users:</span>
                                <span className="font-semibold">{tenant.max_users}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Created:</span>
                                <span className="font-semibold">{new Date(tenant.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(tenant)}
                                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-2"
                            >
                                <MdEdit />
                                Edit
                            </button>
                            <button
                                onClick={() => handleSuspend(tenant.id)}
                                className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center justify-center gap-2"
                            >
                                <MdBlock />
                                Suspend
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">
                            {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tenant Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="Acme Corporation"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Slug (URL identifier)</label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="acme-corp"
                                    disabled={!!editingTenant}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="trial">Trial</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Plan Type</label>
                                <select
                                    value={formData.plan_type}
                                    onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="free">Free</option>
                                    <option value="basic">Basic</option>
                                    <option value="premium">Premium</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Max Users</label>
                                <input
                                    type="number"
                                    value={formData.max_users}
                                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantManagement;
