import React from 'react';

const Settings: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
                <p className="text-gray-600 mt-1">
                    Kelola konfigurasi dan integrasi sistem
                </p>
            </div>

            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center text-gray-500">
                    <p>Pengaturan global (WhatsApp, Pembayaran, Peta) sekarang dikelola oleh Admin Super.</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
