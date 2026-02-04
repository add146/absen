import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdTrendingUp, MdPeople, MdAccessTime } from 'react-icons/md';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total_employees: 0,
        present_today: 0,
        late_today: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon, color }: any) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className={`p-4 rounded-full ${color} text-white`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">{loading ? '...' : value}</h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Ringkasan Dasbor</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Karyawan"
                    value={stats.total_employees}
                    icon={<MdPeople size={24} />}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Hadir Hari Ini"
                    value={stats.present_today}
                    icon={<MdTrendingUp size={24} />}
                    color="bg-green-500"
                />
                <StatCard
                    title="Terlambat Hari Ini"
                    value={stats.late_today}
                    icon={<MdAccessTime size={24} />}
                    color="bg-yellow-500"
                />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Aksi Cepat</h3>
                <p className="text-gray-500">Selamat datang di Panel Admin. Gunakan sidebar untuk mengelola karyawan, lokasi absensi, dan melihat laporan.</p>
            </div>
        </div>
    );
};

export default AdminDashboard;
