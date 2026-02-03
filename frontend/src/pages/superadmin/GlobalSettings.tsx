import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdSave, MdVisibility, MdVisibilityOff, MdCheckCircle } from 'react-icons/md';

const GlobalSettings: React.FC = () => {
    const [settings, setSettings] = useState<any[]>([]);
    const [editedValues, setEditedValues] = useState<{ [key: string]: string }>({});
    const [showSensitive, setShowSensitive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/super-admin/settings?show_sensitive=true');
            setSettings(res.data.data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (key: string, value: string) => {
        setEditedValues({ ...editedValues, [key]: value });
    };

    const handleSave = async (key: string) => {
        setSaving(true);
        try {
            await api.put(`/super-admin/settings/${key}`, { value: editedValues[key] });
            setMessage(`${key} updated successfully`);
            fetchSettings();
            const newEdited = { ...editedValues };
            delete newEdited[key];
            setEditedValues(newEdited);
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Failed to update setting');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    const settingGroups = {
        'WhatsApp Gateway (WAHA)': settings.filter(s => s.setting_key.includes('waha')),
        'Midtrans Payment': settings.filter(s => s.setting_key.includes('midtrans')),
        'Google Maps': settings.filter(s => s.setting_key.includes('google') || s.setting_key.includes('gmaps')),
        'Platform Settings': settings.filter(s => s.setting_key.includes('platform') || s.setting_key.includes('support')),
        'Other': settings.filter(s => !s.setting_key.includes('waha') && !s.setting_key.includes('midtrans') && !s.setting_key.includes('google') && !s.setting_key.includes('gmaps') && !s.setting_key.includes('platform') && !s.setting_key.includes('support'))
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Global Settings</h1>
                <button
                    onClick={() => setShowSensitive(!showSensitive)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                    {showSensitive ? <MdVisibilityOff /> : <MdVisibility />}
                    {showSensitive ? 'Hide' : 'Show'} Sensitive Values
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                        <MdCheckCircle />
                        {message}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {Object.entries(settingGroups).map(([groupName, groupSettings]) => (
                    groupSettings.length > 0 && (
                        <div key={groupName} className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-bold mb-4">{groupName}</h2>
                            <div className="space-y-4">
                                {groupSettings.map((setting: any) => (
                                    <div key={setting.setting_key} className="border-b pb-4 last:border-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <div className="font-medium">{setting.setting_key}</div>
                                                <div className="text-sm text-gray-500">{setting.description}</div>
                                            </div>
                                            {setting.is_sensitive && (
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Sensitive</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type={setting.is_sensitive && !showSensitive ? 'password' : 'text'}
                                                value={editedValues[setting.setting_key] ?? setting.setting_value}
                                                onChange={(e) => handleEdit(setting.setting_key, e.target.value)}
                                                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder={`Enter ${setting.setting_key}`}
                                            />
                                            {editedValues[setting.setting_key] !== undefined && (
                                                <button
                                                    onClick={() => handleSave(setting.setting_key)}
                                                    disabled={saving}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    <MdSave />
                                                    Save
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                    <strong>⚠️ Warning:</strong> Changes to these settings affect the entire platform. Incorrect values may break functionality for all tenants.
                </p>
            </div>
        </div>
    );
};

export default GlobalSettings;
