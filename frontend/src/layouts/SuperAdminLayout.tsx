import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
    MdStorage
} from 'react-icons/md';

const SuperAdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        navigate('/login');
    };

    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

    const menuItems = [
        { path: '/superadmin/dashboard', icon: <MdDashboard size={20} />, label: 'Dashboard' },
        { path: '/superadmin/tenants', icon: <MdBusiness size={20} />, label: 'Tenants' },
        { path: '/superadmin/users', icon: <MdPeople size={20} />, label: 'User Management' },
        { path: '/superadmin/plans', icon: <MdCardGiftcard size={20} />, label: 'Subscription Plans' },
        { path: '/superadmin/analytics', icon: <MdPieChart size={20} />, label: 'Platform Analytics' },
        { path: '/superadmin/settings', icon: <MdSettings size={20} />, label: 'Global Settings' },
        { path: '/superadmin/health', icon: <MdMonitorHeart size={20} />, label: 'System Health' },
        { path: '/superadmin/profile', icon: <MdPerson size={20} />, label: 'My Profile' },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <MdStorage size={28} />
                        <div>
                            <h1 className="text-xl font-bold">Super Admin</h1>
                            <p className="text-xs text-gray-400">Platform Manager</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname.includes(item.path)
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t space-y-2">
                    <div className="px-3 py-2">
                        <p className="text-sm font-semibold text-gray-700">{userData.name || 'Super Admin'}</p>
                        <p className="text-xs text-gray-500 truncate">{userData.email}</p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 p-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <MdLogout size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default SuperAdminLayout;
