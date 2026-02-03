import { useEffect, useState } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { MdHistory, MdAddCircle, MdCheckCircle, MdCancel, MdPending } from 'react-icons/md';

const LeaveRequest = () => {
    const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
    const [leaves, setLeaves] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        if (activeTab === 'history') {
            fetchLeaves();
        } else {
            fetchLeaveTypes();
        }
    }, [activeTab]);

    const fetchLeaveTypes = async () => {
        try {
            const res = await api.get('/leaves/types');
            setLeaveTypes(res.data.data);
            if (res.data.data.length > 0) {
                setFormData(prev => ({ ...prev, leave_type_id: res.data.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch leave types', error);
        }
    };

    const fetchLeaves = async () => {
        try {
            const res = await api.get('/leaves');
            setLeaves(res.data.data);
        } catch (error) {
            console.error('Failed to fetch leaves', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm('Ajukan permohonan cuti ini?')) return;

        try {
            await api.post('/leaves', formData);
            alert('Permohonan cuti berhasil dikirim!');
            setFormData(prev => ({ ...prev, start_date: '', end_date: '', reason: '' }));
            setActiveTab('history');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Gagal mengajukan cuti');
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };
        const icons = {
            pending: <MdPending className="mr-1" />,
            approved: <MdCheckCircle className="mr-1" />,
            rejected: <MdCancel className="mr-1" />
        };
        return (
            <span className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status as keyof typeof styles]}`}>
                {icons[status as keyof typeof icons]}
                {status}
            </span>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* ... Header and Tabs ... */}

                <header className="flex justify-between items-center bg-gradient-to-r from-teal-600 to-emerald-600 p-6 rounded-2xl text-white shadow-lg">
                    <div>
                        <h1 className="text-3xl font-bold">Manajemen Cuti</h1>
                        <p className="opacity-90 mt-1">Ajukan cuti atau izin sakit dengan mudah.</p>
                    </div>
                </header>

                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('request')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'request' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <MdAddCircle /> Ajukan Cuti
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <MdHistory /> Riwayat
                    </button>
                </div>

                {activeTab === 'request' ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipe Cuti</label>
                                <select
                                    required
                                    value={formData.leave_type_id}
                                    onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border"
                                >
                                    <option value="" disabled>Pilih tipe cuti</option>
                                    {leaveTypes.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name} ({type.max_days_per_year} hari/tahun)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Alasan</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border"
                                    placeholder="Jelaskan alasan cuti anda..."
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                >
                                    Kirim Permohonan
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500">Loading history...</div>
                        ) : leaves.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">Belum ada riwayat cuti.</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alasan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {leaves.map((leave) => (
                                        <tr key={leave.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{leave.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{leave.reason}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col items-start gap-1">
                                                    <StatusBadge status={leave.status} />
                                                    {leave.status === 'rejected' && (
                                                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 max-w-[200px] whitespace-normal">
                                                            {leave.rejection_reason ? `Note: ${leave.rejection_reason}` : 'Alasan: -'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
};

export default LeaveRequest;
