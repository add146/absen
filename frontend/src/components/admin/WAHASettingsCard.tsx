import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface WAHASettings {
    waha_enabled: string;
    waha_base_url: string;
    waha_api_key: string;
    waha_session: string;
}

const WAHASettingsCard: React.FC = () => {
    const [settings, setSettings] = useState<WAHASettings>({
        waha_enabled: 'false',
        waha_base_url: '',
        waha_api_key: '',
        waha_session: 'default'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const API_URL = import.meta.env.VITE_API_URL;

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/settings/waha/config`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSettings(response.data.config);
            }
        } catch (error: any) {
            console.error('Failed to load WAHA settings:', error);
            setMessage('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        setSettings(prev => ({
            ...prev,
            waha_enabled: prev.waha_enabled === 'true' ? 'false' : 'true'
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');

        try {
            const token = localStorage.getItem('access_token');
            await axios.post(`${API_URL}/settings/bulk`,
                { settings },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessage('✅ Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            console.error('Failed to save settings:', error);
            setMessage('❌ Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500">Loading WAHA settings...</p>
            </div>
        );
    }

    const isEnabled = settings.waha_enabled === 'true';

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            WhatsApp Notifications (WAHA)
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure WhatsApp notifications via WAHA API
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={handleToggle}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {/* WAHA Base URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        WAHA Base URL
                    </label>
                    <input
                        type="url"
                        name="waha_base_url"
                        value={settings.waha_base_url}
                        onChange={handleChange}
                        disabled={!isEnabled}
                        placeholder="https://your-waha-instance.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        The base URL of your WAHA instance
                    </p>
                </div>

                {/* WAHA API Key */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                    </label>
                    <input
                        type="password"
                        name="waha_api_key"
                        value={settings.waha_api_key}
                        onChange={handleChange}
                        disabled={!isEnabled}
                        placeholder="060731d7987a4c7ebd23a173a8fdb158"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Your WAHA API key for authentication
                    </p>
                </div>

                {/* WAHA Session Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Name
                    </label>
                    <input
                        type="text"
                        name="waha_session"
                        value={settings.waha_session}
                        onChange={handleChange}
                        disabled={!isEnabled}
                        placeholder="default"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        WAHA session name (usually 'default')
                    </p>
                </div>

                {/* Status Indicator */}
                {isEnabled && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="flex items-center">
                            <svg className="h-5 w-5 text-blue-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-blue-700">
                                WhatsApp notifications are <strong>enabled</strong>. Leave approvals and other events will be sent via WhatsApp.
                            </p>
                        </div>
                    </div>
                )}

                {/* Save Button & Message */}
                <div className="flex items-center justify-between pt-4">
                    {message && (
                        <span className={`text-sm ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                            {message}
                        </span>
                    )}
                    <div className="flex-1"></div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WAHASettingsCard;
