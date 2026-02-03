import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdAdd, MdSearch, MdEdit, MdDelete } from 'react-icons/md';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

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

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(filter.toLowerCase()) ||
        emp.email.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Employee Management</h2>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <MdAdd size={20} />
                    <span>Add Employee</span>
                </button>
            </div>

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
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Joined</th>
                            <th className="p-4 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No employees found.</td></tr>
                        ) : (
                            filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{emp.name}</td>
                                    <td className="p-4 text-gray-600">{emp.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500">{new Date(emp.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 flex space-x-2">
                                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><MdEdit /></button>
                                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><MdDelete /></button>
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
