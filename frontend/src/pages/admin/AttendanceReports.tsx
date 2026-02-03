import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdDateRange, MdDownload } from 'react-icons/md';

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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Attendance Reports</h2>
                <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
                    <MdDownload size={20} />
                    <span>Export CSV</span>
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
                    Showing logs for {new Date(date).toLocaleDateString()}
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Employee</th>
                            <th className="p-4 font-semibold text-gray-600">Location</th>
                            <th className="p-4 font-semibold text-gray-600">Check In</th>
                            <th className="p-4 font-semibold text-gray-600">Check Out</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No attendance records found for this date.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{log.user_name}</td>
                                    <td className="p-4 text-gray-600">{log.location_name}</td>
                                    <td className="p-4 text-green-600 font-medium">
                                        {new Date(log.check_in_time).toLocaleTimeString()}
                                    </td>
                                    <td className="p-4 text-red-600 font-medium">
                                        {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.is_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {log.is_valid ? 'Valid' : 'Flagged'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendanceReports;
