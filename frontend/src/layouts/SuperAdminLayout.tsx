import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
    MdDashboard,
    MdBusiness,
    MdSettings,
    MdPeople,
    MdLogout,
    MdCardGiftcard,
    MdPieChart,
    MdPerson,
    MdMonitorHeart,
    MdStorage,
    MdDarkMode,
    MdLightMode
} from 'react-icons/md';

const SuperAdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { darkMode, toggleTheme } = useTheme();

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        navigate('/login');
    };

    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

    const menuItems = [
        { path: '/superadmin/dashboard', icon: <MdDashboard size={20} />, label: 'Dasbor' },
        { path: '/superadmin/tenants', icon: <MdBusiness size={20} />, label: 'Manajemen Penyewa' },
        { path: '/superadmin/users', icon: <MdPeople size={20} />, label: 'Manajemen Pengguna' },
        { path: '/superadmin/plans', icon: <MdCardGiftcard size={20} />, label: 'Paket Langganan' },
        { path: '/superadmin/analytics', icon: <MdPieChart size={20} />, label: 'Analitik Platform' },
        { path: '/superadmin/storage', icon: <MdStorage size={20} />, label: 'Storage Analytics' },
        { path: '/superadmin/settings', icon: <MdSettings size={20} />, label: 'Pengaturan Global' },
        { path: '/superadmin/health', icon: <MdMonitorHeart size={20} />, label: 'Kesehatan Sistem' },
        { path: '/superadmin/profile', icon: <MdPerson size={20} />, label: 'Profil Saya' },
    ];

    return (
        <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col border-r border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <MdStorage size={28} />
                        <div>
                            <h1 className="text-xl font-bold">Admin Super</h1>
                            <p className="text-xs text-gray-400">Manajer Platform</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname.includes(item.path)
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="px-3 py-2">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{userData.name || 'Super Admin'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userData.email}</p>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="flex items-center space-x-3 p-3 w-full text-left text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        {darkMode ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
                        <span className="font-medium">{darkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 p-3 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <MdLogout size={20} />
                        <span className="font-medium">Keluar</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 text-gray-900 dark:text-gray-100">
                <Outlet />
            </main>
        </div>
    );
};

export default SuperAdminLayout;
