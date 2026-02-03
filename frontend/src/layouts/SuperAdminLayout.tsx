import React, { type ReactNode } from 'react';
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

    const isActive = (path: string) => location.pathname.includes(path);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navbar */}
            <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg fixed top-0 left-0 right-0 z-50">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MdStorage className="text-3xl" />
                            <div>
                                <h1 className="text-xl font-bold">Super Admin Panel</h1>
                                <p className="text-xs text-purple-100">SaaS Platform Management</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-semibold">{userData.name}</p>
                                <p className="text-xs text-purple-200">{userData.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
                            >
                                <MdLogout />
                                <span className="text-sm">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Container */}
            <div className="flex pt-16">
                {/* Sidebar */}
                <aside className="w-64 bg-white shadow-md fixed left-0 bottom-0 top-16 overflow-y-auto">
                    <nav className="p-4 space-y-1">
                        <NavLink
                            to="/superadmin/dashboard"
                            icon={<MdDashboard />}
                            label="Dashboard"
                            active={isActive('/superadmin/dashboard')}
                        />
                        <NavLink
                            to="/superadmin/tenants"
                            icon={<MdBusiness />}
                            label="Tenants"
                            active={isActive('/superadmin/tenants')}
                        />
                        <NavLink
                            to="/superadmin/users"
                            icon={<MdPeople />}
                            label="User Management"
                            active={isActive('/superadmin/users')}
                        />
                        <NavLink
                            to="/superadmin/plans"
                            icon={<MdCardGiftcard />}
                            label="Subscription Plans"
                            active={isActive('/superadmin/plans')}
                        />
                        <NavLink
                            to="/superadmin/settings"
                            icon={<MdSettings />}
                            label="Global Settings"
                            active={isActive('/superadmin/settings')}
                        />
                        <NavLink
                            to="/superadmin/analytics"
                            icon={<MdPieChart />}
                            label="Platform Analytics"
                            active={isActive('/superadmin/analytics')}
                        />
                        <div className="border-t my-2"></div>
                        <NavLink
                            to="/superadmin/profile"
                            icon={<MdPerson />}
                            label="My Profile"
                            active={isActive('/superadmin/profile')}
                        />
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 ml-64 p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

interface NavLinkProps {
    to: string;
    icon: ReactNode;
    label: string;
    active: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label, active }) => {
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${active
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-50'
                }`}
        >
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
        </Link>
    );
};

export default SuperAdminLayout;
