import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MdWarning, MdCheckCircle, MdBlock } from 'react-icons/md';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface FraudFlagged {
    id: string;
    user_name: string;
    location_name: string;
    check_in_time: number;
    fraud_flags: any;
}

const FraudDetection: React.FC = () => {
    const [flagged, setFlagged] = useState<FraudFlagged[]>([]);
    const [stats, setStats] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [minScore, setMinScore] = useState(30);

    useEffect(() => {
        fetchData();
    }, [minScore]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [flaggedRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/fraud/flagged?min_score=${minScore}`, { headers }),
                axios.get(`${API_URL}/fraud/stats`, { headers })
            ]);

            setFlagged(flaggedRes.data.data || []);
            setStats(statsRes.data.data || {});
        } catch (error) {
            console.error('Failed to fetch fraud data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreBadge = (score: number) => {
        if (score >= 70) return <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-semibold">Risiko Tinggi ({score})</span>;
        if (score >= 40) return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-semibold">Sedang ({score})</span>;
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">Rendah ({score})</span>;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Deteksi Kecurangan</h1>
                <p className="text-gray-600 mt-1">Pantau pola kehadiran yang mencurigakan</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Ditandai</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_flagged || 0}</p>
                        </div>
                        <MdWarning className="text-yellow-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Risiko Tinggi</p>
                            <p className="text-2xl font-bold text-red-600">{stats.high_risk || 0}</p>
                        </div>
                        <MdBlock className="text-red-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Lokasi Palsu</p>
                            <p className="text-2xl font-bold text-orange-600">{stats.mock_location_detected || 0}</p>
                        </div>
                        <MdWarning className="text-orange-500" size={32} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Perjalanan Mustahil</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.impossible_travel_detected || 0}</p>
                        </div>
                        <MdWarning className="text-purple-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="mb-4 flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Skor Minimum:</label>
                <select
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value))}
                    className="border rounded-lg px-3 py-2"
                >
                    <option value="0">Semua (0+)</option>
                    <option value="30">Rendah (30+)</option>
                    <option value="50">Tinggi (50+)</option>
                    <option value="70">Kritis (70+)</option>
                </select>
            </div>

            {/* Flagged List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pengguna</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lokasi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skor Risiko</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indikator</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {flagged.map((item) => {
                            const fraudData = typeof item.fraud_flags === 'string' ? JSON.parse(item.fraud_flags) : item.fraud_flags;
                            return (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.user_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location_name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(item.check_in_time * 1000).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getScoreBadge(fraudData?.score || 0)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex flex-wrap gap-1">
                                            {fraudData?.mock_location && <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">Mock GPS</span>}
                                            {fraudData?.impossible_travel && <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded">Perjalanan Mustahil</span>}
                                            {fraudData?.unusual_time && <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded">Waktu Tidak Wajar</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {flagged.length === 0 && (
                    <div className="text-center py-12">
                        <MdCheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                        <p className="text-gray-500">Tidak ada aktivitas mencurigakan terdeteksi</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FraudDetection;
