import React, { useState } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { MdSecurity, MdDarkMode, MdLightMode, MdLock, MdCheckCircle, MdError } from 'react-icons/md';

const Settings: React.FC = () => {
    const [formData, setFormData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { darkMode, toggleTheme } = useTheme();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (formData.new_password !== formData.confirm_password) {
            setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
            return;
        }

        if (formData.new_password.length < 6) {
            setMessage({ type: 'error', text: 'Password minimal 6 karakter.' });
            return;
        }

        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                current_password: formData.current_password,
                new_password: formData.new_password
            });
            setMessage({ type: 'success', text: 'Password berhasil diperbarui!' });
            setFormData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error: any) {
            console.error('Change password error:', error);
            const status = error.response?.status;
            const data = error.response?.data;
            let detail = 'Gagal mengubah password.';

            if (data && data.error) {
                detail = `${data.error} ${data.details ? `(${data.details})` : ''}`;
            } else if (status) {
                detail = `Error Status: ${status} - ${error.message}`;
            } else {
                detail = error.message || 'Unknown Error';
            }

            setMessage({ type: 'error', text: detail });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan Akun</h1>
                <p className="text-gray-500 dark:text-gray-400">Kelola keamanan dan preferensi tampilan Anda</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Security Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg mr-3">
                            <MdSecurity className="text-2xl" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Ganti Password</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {message && (
                            <div className={`p-3 rounded-lg flex items-center text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                                {message.type === 'success' ? <MdCheckCircle className="mr-2 text-lg" /> : <MdError className="mr-2 text-lg" />}
                                {message.text}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password Saat Ini</label>
                            <div className="relative">
                                <MdLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    name="current_password"
                                    value={formData.current_password}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password Baru</label>
                            <div className="relative">
                                <MdLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    name="new_password"
                                    value={formData.new_password}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Minimal 6 karakter"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konfirmasi Password Baru</label>
                            <div className="relative">
                                <MdLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    name="confirm_password"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Ulangi password baru"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-2.5 rounded-xl font-semibold text-white transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'}`}
                            >
                                {loading ? 'Menyimpan...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Appearance Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                    <div className="flex items-center mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg mr-3">
                            {darkMode ? <MdDarkMode className="text-2xl" /> : <MdLightMode className="text-2xl" />}
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tampilan</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">Mode Gelap</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sesuaikan tampilan dashboard admin</p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${darkMode ? 'bg-purple-600' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`${darkMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
