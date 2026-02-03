import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MdAdd, MdEdit, MdDelete, MdToggleOn, MdToggleOff } from 'react-icons/md';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface PointRule {
    id: string;
    name: string;
    rule_type: string;
    points_amount: number;
    conditions: any;
    is_active: number;
}

const PointRulesManagement: React.FC = () => {
    const [rules, setRules] = useState<PointRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState<PointRule | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        rule_type: 'check_in',
        points_amount: 10,
        conditions: {}
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/point-rules`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRules(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (editingRule) {
                await axios.put(`${API_URL}/point-rules/${editingRule.id}`, formData, { headers });
            } else {
                await axios.post(`${API_URL}/point-rules`, formData, { headers });
            }

            setShowModal(false);
            setEditingRule(null);
            setFormData({ name: '', rule_type: 'check_in', points_amount: 10, conditions: {} });
            fetchRules();
        } catch (error) {
            console.error('Failed to save rule:', error);
            alert('Failed to save point rule');
        }
    };

    const toggleActive = async (rule: PointRule) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_URL}/point-rules/${rule.id}`,
                { is_active: rule.is_active ? 0 : 1 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchRules();
        } catch (error) {
            console.error('Failed to toggle rule:', error);
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/point-rules/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRules();
        } catch (error) {
            console.error('Failed to delete rule:', error);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Point Rules Management</h1>
                    <p className="text-gray-600 mt-1">Configure dynamic point earning rules</p>
                </div>
                <button
                    onClick={() => {
                        setEditingRule(null);
                        setFormData({ name: '', rule_type: 'check_in', points_amount: 10, conditions: {} });
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                    <MdAdd size={20} />
                    Add Rule
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rules.map((rule) => (
                            <tr key={rule.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rule.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{rule.rule_type}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rule.points_amount} pts</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => toggleActive(rule)}
                                        className={`flex items-center gap-1 ${rule.is_active ? 'text-green-600' : 'text-gray-400'}`}
                                    >
                                        {rule.is_active ? <MdToggleOn size={24} /> : <MdToggleOff size={24} />}
                                        <span className="text-sm">{rule.is_active ? 'Active' : 'Inactive'}</span>
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => {
                                            setEditingRule(rule);
                                            setFormData({
                                                name: rule.name,
                                                rule_type: rule.rule_type,
                                                points_amount: rule.points_amount,
                                                conditions: rule.conditions
                                            });
                                            setShowModal(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                    >
                                        <MdEdit size={20} />
                                    </button>
                                    <button
                                        onClick={() => deleteRule(rule.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <MdDelete size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">{editingRule ? 'Edit' : 'Add'} Point Rule</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
                                <select
                                    value={formData.rule_type}
                                    onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="check_in">Check-in</option>
                                    <option value="on_time">On-Time Bonus</option>
                                    <option value="streak">Streak Bonus</option>
                                    <option value="full_day">Full Day Bonus</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Points Amount</label>
                                <input
                                    type="number"
                                    value={formData.points_amount}
                                    onChange={(e) => setFormData({ ...formData, points_amount: parseInt(e.target.value) })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PointRulesManagement;
