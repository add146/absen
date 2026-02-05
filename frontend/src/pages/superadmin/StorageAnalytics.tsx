import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdRefresh, MdCleaningServices, MdStorage, MdCloudDownload } from 'react-icons/md';

interface StorageStats {
    total: {
        total_files: number;
        total_storage: number;
    };
    byType: {
        file_type: string;
        file_count: number;
        total_size: number;
        avg_size: number;
        optimized_count: number;
    }[];
}

const StorageAnalytics: React.FC = () => {
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [cleanupLoading, setCleanupLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/super-admin/storage/summary');
            setStats(response.data.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch storage analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleCleanup = async () => {
        if (!window.confirm('Are you sure you want to run storage cleanup? This will delete files older than 90 days.')) {
            return;
        }

        try {
            setCleanupLoading(true);
            const response = await api.post('/super-admin/storage/trigger-cleanup');
            setMessage(`Cleanup complete: ${response.data.result.filesDeleted} files deleted, ${(response.data.result.spaceFreed / 1024 / 1024).toFixed(2)} MB freed.`);
            fetchStats();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Cleanup failed');
        } finally {
            setCleanupLoading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading && !stats) {
        return <div className="p-8 text-center text-gray-500">Loading storage analytics...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Storage Analytics</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monitor storage usage and optimize costs</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <MdRefresh size={20} />
                        Refresh
                    </button>
                    <button
                        onClick={handleCleanup}
                        disabled={cleanupLoading}
                        className={`px-4 py-2 flex items-center gap-2 bg-red-600 text-white rounded-lg hover:bg-red-700 ${cleanupLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <MdCleaningServices size={20} />
                        Run Cleanup
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {message && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-4 rounded-lg text-green-700 dark:text-green-400">
                    {message}
                </div>
            )}

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <MdStorage size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Storage</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                                {formatBytes(stats?.total.total_storage || 0)}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <MdCloudDownload size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Files</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                                {stats?.total.total_files.toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <MdCleaningServices size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Optimized Files</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                                {stats?.byType.reduce((acc, curr) => acc + curr.optimized_count, 0).toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Storage Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">File Type</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Count</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Size</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Avg Size</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Optimized</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {stats?.byType.map((item) => (
                                <tr key={item.file_type} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 capitalize">{item.file_type}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.file_count.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatBytes(item.total_size)}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatBytes(item.avg_size)}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{ width: `${(item.optimized_count / item.file_count) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs">{((item.optimized_count / item.file_count) * 100).toFixed(0)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!stats?.byType || stats.byType.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No files found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StorageAnalytics;
