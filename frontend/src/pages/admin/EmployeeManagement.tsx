
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdAdd, MdSearch, MdEdit, MdDelete, MdHistory } from 'react-icons/md';
import AttendanceCalendarView from '../../components/AttendanceCalendarView';

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
    // History Modal State
    const [showHistory, setShowHistory] = useState(false);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

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
        setSelectedEmployeeId(employee.id);
        setShowHistory(true);
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
                                        <button onClick={() => handleViewHistory(emp)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200" title="Riwayat Absensi"><MdHistory size={20} /></button>
                                        <button onClick={() => handleEdit(emp)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200" title="Edit"><MdEdit size={20} /></button>
                                        <button onClick={() => handleDelete(emp.id, emp.name)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200" title="Hapus"><MdDelete size={20} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Attendance History Modal */}
            {/* Attendance History Modal */}
            {
                showHistory && selectedEmployeeId && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] flex flex-col p-6 overflow-hidden relative">
                            {/* Close button handled inside component or here if we want absolute positioning */}
                            <div className="overflow-y-auto h-full pr-2">
                                <AttendanceCalendarView
                                    userId={selectedEmployeeId}
                                    userName={selectedEmployeeName}
                                    onClose={() => setShowHistory(false)}
                                />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default EmployeeManagement;
