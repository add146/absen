import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdEdit, MdSave } from 'react-icons/md';

const PlanManagement: React.FC = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [editedPlans, setEditedPlans] = useState<{ [key: string]: any }>({});
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await api.get('/super-admin/plans');
            setPlans(res.data.data);
        } catch (error) {
            console.error('Failed to fetch plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (plan: any) => {
        setEditing(plan.id);
        setEditedPlans({
            ...editedPlans,
            [plan.id]: {
                price: plan.price,
                is_active: plan.is_active,
                features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
            }
        });
    };

    const handleSave = async (planId: string) => {
        try {
            await api.put(`/super-admin/plans/${planId}`, editedPlans[planId]);
            setMessage('Plan updated successfully');
            setEditing(null);
            fetchPlans();
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Failed to update plan');
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Subscription Plans</h1>

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan: any) => {
                    const isEditing = editing === plan.id;
                    const editData = editedPlans[plan.id] || {};
                    const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;

                    return (
                        <div key={plan.id} className={`bg-white rounded-lg shadow p-6 ${plan.slug === 'premium' ? 'ring-2 ring-indigo-500' : ''}`}>
                            {plan.slug === 'premium' && (
                                <div className="text-center mb-2">
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                                        POPULAR
                                    </span>
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                {isEditing ? (
                                    <div className="mb-2">
                                        <input
                                            type="number"
                                            value={editData.price}
                                            onChange={(e) => setEditedPlans({
                                                ...editedPlans,
                                                [plan.id]: { ...editData, price: parseInt(e.target.value) }
                                            })}
                                            className="w-full px-3 py-2 border rounded text-center"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-3xl font-bold text-indigo-600">
                                        {formatPrice(plan.price)}
                                    </div>
                                )}
                                <div className="text-sm text-gray-500">per {plan.interval}</div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <FeatureItem feature="Max Users" value={features.maxUsers === -1 ? 'Unlimited' : features.maxUsers} />
                                <FeatureItem feature="Geofencing" value={features.geofencing ? '✓' : '✗'} />
                                <FeatureItem feature="Reports" value={features.reports} />
                                <FeatureItem feature="Custom Branding" value={features.customBranding ? '✓' : '✗'} />
                                <FeatureItem feature="API Access" value={features.apiAccess ? '✓' : '✗'} />
                                <FeatureItem feature="Custom Domain" value={features.customDomain ? '✓' : '✗'} />
                                <FeatureItem feature="Support" value={features.support} />
                            </div>

                            <div className="pt-4 border-t">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={editData.is_active}
                                                onChange={(e) => setEditedPlans({
                                                    ...editedPlans,
                                                    [plan.id]: { ...editData, is_active: e.target.checked ? 1 : 0 }
                                                })}
                                            />
                                            <span className="text-sm">Active</span>
                                        </label>
                                        <button
                                            onClick={() => handleSave(plan.id)}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                                        >
                                            <MdSave />
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => setEditing(null)}
                                            className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-2 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {plan.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleEdit(plan)}
                                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                                        >
                                            <MdEdit />
                                            Edit Plan
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>💡 Note:</strong> Price changes will affect new subscriptions only. Existing subscriptions will continue at their current rate.
                </p>
            </div>
        </div>
    );
};

const FeatureItem = ({ feature, value }: { feature: string; value: any }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">{feature}</span>
        <span className="font-semibold capitalize">{value}</span>
    </div>
);

export default PlanManagement;
