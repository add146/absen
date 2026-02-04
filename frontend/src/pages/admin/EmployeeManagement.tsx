
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdAdd, MdSearch, MdEdit, MdDelete, MdHistory, MdClose } from 'react-icons/md';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        is_field_worker: false
    });

    // History Modal State
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            // Fetch users with role='employee'
            const res = await api.get('/admin/users?role=employee');
            setEmployees(res.data.data);
        } catch (error) {
            console.error('Failed to fetch employees', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update existing
                await api.put(`/admin/users/${editingId}`, formData);
                alert('Karyawan berhasil diperbarui!');
            } else {
                // Create new
                await api.post('/admin/users', formData);
                alert('Karyawan berhasil dibuat! Bagikan kredensial kepada karyawan.');
            }

            setShowForm(false);
            setEditingId(null);
            setFormData({ name: '', email: '', password: '', role: 'employee', is_field_worker: false });
            fetchEmployees();
        } catch (error: any) {
            console.error('Failed to save employee', error);
            alert(error.response?.data?.error || 'Gagal menyimpan karyawan');
        }
    };

    const handleEdit = (employee: any) => {
        setEditingId(employee.id);
        setFormData({
            name: employee.name,
            email: employee.email,
            password: '', // Keep empty to indicate no change
            role: employee.role,
            is_field_worker: employee.is_field_worker === 1
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus ${name}? Tindakan ini tidak dapat dibatalkan.`)) return;

        try {
            await api.delete(`/admin/users/${id}`);
            alert('Karyawan berhasil dihapus');
            fetchEmployees();
        } catch (error: any) {
            console.error('Failed to delete employee', error);
            alert(error.response?.data?.error || 'Gagal menghapus karyawan');
        }
    }

    const handleViewHistory = async (employee: any) => {
        setSelectedEmployeeName(employee.name);
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            console.log('Fetching attendance for user:', employee.id);
            const res = await api.get(`/admin/attendance?user_id=${employee.id}&limit=20`);
            console.log('Attendance data received:', res.data);
            setHistoryData(res.data.data);
        } catch (error: any) {
            console.error('Failed to fetch history:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            alert(`Gagal mengambil riwayat absensi: ${error.response?.data?.error || error.message}`);
        } finally {
            setHistoryLoading(false);
        }
    }

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(filter.toLowerCase()) ||
        emp.email.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Manajemen Karyawan</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <MdAdd size={20} />
                    <span>Tambah Karyawan</span>
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                    <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                            <input
                                type="text"
                                required
                                className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                required
                                className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@company.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder={editingId ? "Kosongkan jika tidak ingin mengubah password" : "Minimal 6 karakter"}
                            />
                            <p className="text-xs text-gray-500 mt-1">⚠️ Bagikan password ini kepada karyawan secara aman</p>
                        </div>

                        {/* Field Worker Toggle */}
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                id="is_field_worker"
                                checked={formData.is_field_worker}
                                onChange={e => setFormData({ ...formData, is_field_worker: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <label htmlFor="is_field_worker" className="text-sm font-medium text-gray-700 cursor-pointer">
                                🚗 Field Worker (Marketing/Driver) - Akses Log Kunjungan
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Peran</label>
                            <select
                                className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="employee">Karyawan</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setFormData({ name: '', email: '', password: '', role: 'employee', is_field_worker: false });
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                {editingId ? 'Update Karyawan' : 'Buat Karyawan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
                <MdSearch className="text-gray-400" size={24} />
                <input
                    type="text"
                    placeholder="Cari karyawan berdasarkan nama atau email..."
                    className="flex-1 outline-none text-gray-700"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Nama</th>
                            <th className="p-4 font-semibold text-gray-600">Email</th>
                            <th className="p-4 font-semibold text-gray-600">Peran</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Bergabung</th>
                            <th className="p-4 font-semibold text-gray-600">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Memuat...</td></tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada karyawan ditemukan.</td></tr>
                        ) : (
                            filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-800">{emp.name}</span>
                                            {emp.is_field_worker === 1 && (
                                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold">
                                                    🚗 Field Worker
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{emp.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {emp.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500">{new Date(emp.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 flex space-x-2">
                                        <button onClick={() => handleViewHistory(emp)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Riwayat Absensi"><MdHistory /></button>
                                        <button onClick={() => handleEdit(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><MdEdit /></button>
                                        <button onClick={() => handleDelete(emp.id, emp.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus"><MdDelete /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Attendance History Modal */}
            {
                showHistory && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h3 className="text-xl font-bold">Riwayat Absensi: {selectedEmployeeName}</h3>
                                <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-700">
                                    <MdClose size={24} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1">
                                {historyLoading ? (
                                    <div className="text-center py-8">Memuat riwayat...</div>
                                ) : historyData.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">Belum ada data absensi untuk karyawan ini.</div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-3 text-sm font-semibold">Tanggal</th>
                                                <th className="p-3 text-sm font-semibold">Masuk</th>
                                                <th className="p-3 text-sm font-semibold">Keluar</th>
                                                <th className="p-3 text-sm font-semibold">Lokasi</th>
                                                <th className="p-3 text-sm font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {historyData.map((log: any) => (
                                                <tr key={log.id}>
                                                    <td className="p-3 text-sm">{new Date(log.check_in_time).toLocaleDateString()}</td>
                                                    <td className="p-3 text-sm font-mono text-green-600">
                                                        {log.type === 'presence' ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </td>
                                                    <td className="p-3 text-sm font-mono text-red-600">
                                                        {log.type === 'presence' && log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        {log.type === 'presence' ? (log.location_name || 'Kantor') : `Cuti: ${log.leave_type}`}
                                                    </td>
                                                    <td className="p-3">
                                                        {log.type === 'leave' ? (
                                                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-semibold">
                                                                Cuti
                                                            </span>
                                                        ) : !log.is_valid ? (
                                                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-semibold">
                                                                Invalid
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-semibold">
                                                                Hadir
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default EmployeeManagement;
