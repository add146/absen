import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdTrendingUp, MdPeople, MdAccessTime, MdContentCopy, MdBusiness } from 'react-icons/md';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total_employees: 0,
        present_today: 0,
        late_today: 0,
        tenant: { name: '', slug: '' }
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
            {/* Company Code Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <MdBusiness className="text-blue-200 text-xl" />
                            <h2 className="text-lg font-medium text-blue-100">Kode Perusahaan</h2>
                        </div>
                        <p className="text-sm text-blue-200">Bagikan kode ini kepada karyawan untuk registrasi.</p>
                    </div>

                    <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
                        <code className="px-4 py-2 font-mono text-xl font-bold tracking-wider">{stats.tenant?.slug || '...'}</code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(stats.tenant?.slug || '');
                                alert('Kode perusahaan disalin!');
                            }}
                            className="p-2 hover:bg-white/20 rounded-md transition-colors"
                            title="Salin Kode"
                        >
                            <MdContentCopy className="text-xl" />
                        </button>
                    </div>
                </div>

                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ringkasan Dasbor</h2>

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
