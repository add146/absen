import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdCheckCircle, MdCancel, MdPerson } from 'react-icons/md';

const LeaveApproval = () => {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingLeaves();
    }, []);

    const fetchPendingLeaves = async () => {
        try {
            const res = await api.get('/leaves/pending');
            setLeaves(res.data.data);
        } catch (error) {
            console.error('Failed to fetch pending leaves', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
        const reason = status === 'rejected' ? prompt('Alasan penolakan (opsional):') : null;
        if (status === 'rejected' && reason === null) return; // Cancelled

        try {
            await api.put(`/leaves/${id}/status`, { status, rejection_reason: reason });
            alert(`Permohonan berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
            fetchPendingLeaves(); // Refresh list
        } catch (error: any) {
            console.error('Failed to update status', error);
            alert(error.response?.data?.error || 'Update failed');
        }
    };

    return (
        <div className="space-y-6">
            <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-800">Leave Approvals</h1>
                <p className="text-gray-500">Manage employee leave requests.</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading requests...</div>
                ) : leaves.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Tidak ada permohonan pending.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {leaves.map((leave) => (
                            <div key={leave.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                        <MdPerson size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">{leave.user_name}</h3>
                                        <p className="text-sm text-gray-500 capitalize">{leave.user_role} • <span className="font-medium text-gray-700 capitalize">{leave.type} Leave</span></p>

                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Periode:</span> {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Alasan:</span> {leave.reason}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleApproval(leave.id, 'approved')}
                                        className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <MdCheckCircle /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleApproval(leave.id, 'rejected')}
                                        className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <MdCancel /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveApproval;
