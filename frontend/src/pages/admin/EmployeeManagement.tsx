import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdAdd, MdSearch, MdEdit, MdDelete } from 'react-icons/md';

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
        role: 'employee'
    });

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
                alert('Employee updated successfully!');
            } else {
                // Create new
                await api.post('/admin/users', formData);
                alert('Employee created successfully! Share the credentials with the employee.');
            }

            setShowForm(false);
            setEditingId(null);
            setFormData({ name: '', email: '', password: '', role: 'employee' });
            fetchEmployees();
        } catch (error: any) {
            console.error('Failed to save employee', error);
            alert(error.response?.data?.error || 'Failed to save employee');
        }
    };

    const handleEdit = (employee: any) => {
        setEditingId(employee.id);
        setFormData({
            name: employee.name,
            email: employee.email,
            password: '', // Keep empty to indicate no change
            role: employee.role
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

        try {
            await api.delete(`/admin/users/${id}`);
            alert('Employee deleted successfully');
            fetchEmployees();
        } catch (error: any) {
            console.error('Failed to delete employee', error);
            alert(error.response?.data?.error || 'Failed to delete employee');
        }
    }

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(filter.toLowerCase()) ||
        emp.email.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Employee Management</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <MdAdd size={20} />
                    <span>Add Employee</span>
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                    <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
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
                                placeholder={editingId ? "Leave blank to keep current password" : "Minimum 6 characters"}
                            />
                            <p className="text-xs text-gray-500 mt-1">⚠️ Share this password with the employee securely</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <select
                                className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setFormData({ name: '', email: '', password: '', role: 'employee' });
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                {editingId ? 'Update Employee' : 'Create Employee'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
                <MdSearch className="text-gray-400" size={24} />
                <input
                    type="text"
                    placeholder="Search employees by name or email..."
                    className="flex-1 outline-none text-gray-700"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Name</th>
                            <th className="p-4 font-semibold text-gray-600">Email</th>
                            <th className="p-4 font-semibold text-gray-600">Role</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Joined</th>
                            <th className="p-4 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No employees found.</td></tr>
                        ) : (
                            filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{emp.name}</td>
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
                                        <button onClick={() => handleEdit(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><MdEdit /></button>
                                        <button onClick={() => handleDelete(emp.id, emp.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><MdDelete /></button>
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

export default EmployeeManagement;
