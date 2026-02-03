import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdPerson, MdCleaningServices } from 'react-icons/md';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/super-admin/users?limit=100');
            setUsers(res.data.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.length === 0) return;
        if (!confirm(`Delete ${selectedUsers.length} users?`)) return;

        try {
            await api.post('/super-admin/users/bulk-delete', { user_ids: selectedUsers });
            setMessage('Users deleted successfully');
            fetchUsers();
            setSelectedUsers([]);
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Failed to delete users');
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const handleCleanup = async () => {
        if (!confirm('Delete all inactive users with no attendance records?')) return;

        try {
            const res = await api.post('/super-admin/users/cleanup', { days_inactive: 90 });
            setMessage(`Cleaned up ${res.data.deletedCount} users`);
            fetchUsers();
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Failed to cleanup users');
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const toggleUserSelect = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">User Management</h1>
                <button
                    onClick={handleCleanup}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                    <MdCleaningServices />
                    Cleanup Inactive Users
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.includes('success') || message.includes('Cleaned') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            {selectedUsers.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                    <span>{selectedUsers.length} users selected</span>
                    <button
                        onClick={handleBulkDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Delete Selected
                    </button>
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                <input
                                    type="checkbox"
                                    onChange={(e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])}
                                    checked={selectedUsers.length === users.length}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id} className={`hover:bg-gray-50 ${selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}`}>
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => toggleUserSelect(user.id)}
                                        disabled={user.role === 'super_admin'}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <MdPerson className="text-gray-400" />
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{user.tenant_name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${user.status === 'active' ? 'bg-green-100 text-green-700' :
                                        user.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-sm text-gray-500">
                Showing {users.length} users
            </div>
        </div>
    );
};

export default UserManagement;
