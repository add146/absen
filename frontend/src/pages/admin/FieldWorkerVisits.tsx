import React, { useState, useEffect } from 'react';
import { MdFileDownload, MdSearch } from 'react-icons/md';
import api from '../../services/api';

const FieldWorkerVisits: React.FC = () => {
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        user_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        fetchEmployees();
        fetchVisits();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/admin/users?role=employee');
            setEmployees(res.data.data.filter((u: any) => u.is_field_worker === 1));
        } catch (error) {
            console.error('Failed to fetch employees', error);
        }
    };

    const fetchVisits = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.user_id) params.append('user_id', filters.user_id);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);

            const res = await api.get(`/admin/visits?${params.toString()}`);
            setVisits(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch visits', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.user_id) params.append('user_id', filters.user_id);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);
            params.append('format', 'csv');

            const res = await api.get(`/admin/visits?${params.toString()}`);

            // Create CSV blob and download
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `field-worker-visits-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export CSV', error);
            alert('Gagal export CSV');
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">🚗 Field Worker Visits</h2>
                    <p className="text-gray-600 mt-1">Lihat dan kelola kunjungan field workers</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                >
                    <MdFileDownload size={20} />
                    <span>Export CSV</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Filter</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Field Worker</label>
                        <select
                            value={filters.user_id}
                            onChange={e => setFilters({ ...filters, user_id: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Semua Field Worker</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={filters.start_date}
                            onChange={e => setFilters({ ...filters, start_date: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                        <input
                            type="date"
                            value={filters.end_date}
                            onChange={e => setFilters({ ...filters, end_date: e.target.value })}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={fetchVisits}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                    >
                        <MdSearch size={20} />
                        Cari
                    </button>
                </div>
            </div>

            {/* Visits Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b">
                    <h3 className="font-semibold text-gray-800">
                        Kunjungan ({visits.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Memuat...</div>
                ) : visits.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Tidak ada kunjungan ditemukan</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 text-left font-semibold text-gray-600">Waktu</th>
                                    <th className="p-4 text-left font-semibold text-gray-600">Field Worker</th>
                                    <th className="p-4 text-left font-semibold text-gray-600">Lokasi</th>
                                    <th className="p-4 text-left font-semibold text-gray-600">Catatan</th>
                                    <th className="p-4 text-left font-semibold text-gray-600">GPS</th>
                                    <th className="p-4 text-left font-semibold text-gray-600">Foto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visits.map((visit) => (
                                    <tr key={visit.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-700">{formatTime(visit.visit_time)}</td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-800">{visit.user_name}</div>
                                            <div className="text-xs text-gray-500">{visit.user_email}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-700">{visit.location_name || '-'}</td>
                                        <td className="p-4 text-sm text-gray-600">{visit.notes || '-'}</td>
                                        <td className="p-4 text-xs text-gray-500 font-mono">
                                            {visit.latitude?.toFixed(6)},<br />{visit.longitude?.toFixed(6)}
                                        </td>
                                        <td className="p-4">
                                            {visit.photo_url ? (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Ada</span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FieldWorkerVisits;
