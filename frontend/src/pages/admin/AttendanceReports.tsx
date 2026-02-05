import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdDateRange, MdDownload, MdArrowForward } from 'react-icons/md';

const AttendanceReports = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchLogs();
    }, [date]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Fetch attendance for specific date
            const res = await api.get(`/admin/attendance?start_date=${date}&end_date=${date}`);
            setLogs(res.data.data);
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    return (
    // Photo Modal
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Laporan Kehadiran</h2>
                <button
                    onClick={() => {
                        const token = localStorage.getItem('access_token');
                        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/admin/attendance?start_date=${date}&end_date=${date}&format=csv`;

                        // Use authorized fetch to get blob if auth is needed, or if cookie-based it's easier.
                        // Since we need headers for Authorization: Bearer, we can't just window.open directly if we rely on headers.
                        // But wait, the backend expects Bearer token.

                        fetch(url, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        })
                            .then(response => response.blob())
                            .then(blob => {
                                const link = document.createElement("a");
                                const url = URL.createObjectURL(blob);
                                link.setAttribute("href", url);
                                link.setAttribute("download", `attendance_report_${date}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            })
                            .catch(err => console.error("Export failed", err));
                    }}
                    className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                    disabled={loading}
                >
                    <MdDownload size={20} />
                    <span>Ekspor CSV (Server)</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
                <MdDateRange className="text-gray-400" size={24} />
                <input
                    type="date"
                    className="outline-none text-gray-700 bg-transparent"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
                <span className="text-sm text-gray-500 ml-auto">
                    Menampilkan log untuk {new Date(date).toLocaleDateString()}
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Karyawan</th>
                            <th className="p-4 font-semibold text-gray-600">Lokasi</th>
                            <th className="p-4 font-semibold text-gray-600">Masuk</th>
                            <th className="p-4 font-semibold text-gray-600">Keluar</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Foto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Memuat...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada catatan kehadiran untuk tanggal ini.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{log.user_name}</td>
                                    <td className="p-4 text-gray-600">
                                        <div className="flex flex-col">
                                            <span>{log.location_name}</span>
                                            {log.checkout_location_name && log.checkout_location_name !== log.location_name && (
                                                <span className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                                                    <MdArrowForward className="text-[10px]" />
                                                    Keluar: {log.checkout_location_name}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-green-600 font-medium">
                                        {new Date(log.check_in_time).toLocaleTimeString()}
                                    </td>
                                    <td className="p-4 text-red-600 font-medium">
                                        {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.is_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {log.is_valid ? 'Sah' : 'Ditandai'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {log.face_photo_url ? (
                                            <button
                                                onClick={() => setSelectedPhoto(log.face_photo_url)}
                                                className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-200 transition font-medium"
                                            >
                                                Lihat Foto
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Photo Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-2xl w-full">
                        <button
                            className="absolute -top-10 right-0 text-white hover:text-gray-300"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            Tutup [Esc]
                        </button>
                        <img
                            src={selectedPhoto}
                            alt="Verification"
                            className="w-full h-auto rounded-lg shadow-2xl border-4 border-white"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceReports;
