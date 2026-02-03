import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdEdit, MdSave, MdCancel, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const SuperAdminProfile: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [editing, setEditing] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPasswords, setShowPasswords] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/super-admin/profile');
            setProfile(res.data);
            setFormData({
                name: res.data.name,
                email: res.data.email,
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (changingPassword) {
            if (formData.new_password !== formData.confirm_password) {
                setMessage('Passwords do not match');
                setTimeout(() => setMessage(''), 3000);
                return;
            }
            if (!formData.current_password || !formData.new_password) {
                setMessage('Please fill all password fields');
                setTimeout(() => setMessage(''), 3000);
                return;
            }
        }

        setSaving(true);
        try {
            await api.put('/super-admin/profile', {
                name: formData.name,
                email: formData.email,
                ...(changingPassword && {
                    current_password: formData.current_password,
                    new_password: formData.new_password
                })
            });
            setMessage('Profile updated successfully');
            setEditing(false);
            setChangingPassword(false);
            fetchProfile();

            // Update localStorage
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            userData.name = formData.name;
            userData.email = formData.email;
            localStorage.setItem('user_data', JSON.stringify(userData));
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: profile.name,
            email: profile.email,
            current_password: '',
            new_password: '',
            confirm_password: ''
        });
        setEditing(false);
        setChangingPassword(false);
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div className="max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">My Profile</h1>

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="bg-white rounded-lg shadow p-6 space-y-6">
                {/* Basic Info */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!editing}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!editing}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <input
                        type="text"
                        value={profile?.role}
                        disabled
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                    />
                </div>

                {/* Password Change Section */}
                {editing && (
                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Change Password</h3>
                            <button
                                onClick={() => setChangingPassword(!changingPassword)}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                {changingPassword ? 'Cancel Password Change' : 'Change Password'}
                            </button>
                        </div>

                        {changingPassword && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords ? 'text' : 'password'}
                                            value={formData.current_password}
                                            onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                        >
                                            {showPasswords ? <MdVisibilityOff /> : <MdVisibility />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={formData.new_password}
                                        onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={formData.confirm_password}
                                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <MdEdit />
                            Edit Profile
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <MdSave />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                <MdCancel />
                                Cancel
                            </button>
                        </>
                    )}
                </div>

                {/* Account Info */}
                <div className="border-t pt-6 text-sm text-gray-500">
                    <p>Account Created: {new Date(profile?.created_at).toLocaleDateString()}</p>
                    <p>Last Updated: {new Date(profile?.updated_at).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminProfile;
