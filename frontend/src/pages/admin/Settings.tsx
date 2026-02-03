import React from 'react';

const Settings: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-600 mt-1">
                    Manage system-wide configurations and integrations
                </p>
            </div>

            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center text-gray-500">
                    <p>Global settings (WhatsApp, Payment, Maps) are now managed by Super Admin.</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
