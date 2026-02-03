import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    MdToken,
    MdDashboard,
    MdSchedule,
    MdFlightTakeoff,
    MdGroup,
    MdLeaderboard,
    MdSettings,
    MdLogout,
    MdNotifications,
    MdDarkMode,
    MdLightMode,
    MdMenu,
    MdPerson
} from 'react-icons/md';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        navigate('/login');
    };

    const toggleTheme = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
    };

    const user = JSON.parse(localStorage.getItem('user_data') || '{}');

    const navItems = [
        { name: 'Dashboard', icon: <MdDashboard />, path: '/dashboard' },
        { name: 'Attendance', icon: <MdSchedule />, path: '/attendance' },
        { name: 'Leaves', icon: <MdFlightTakeoff />, path: '/leaves' },
        { name: 'Team', icon: <MdGroup />, path: '/team' },
        { name: 'Rewards', icon: <MdLeaderboard />, path: '/rewards', badge: '120 pts' },
        { name: 'Profile', icon: <MdPerson />, path: '/profile' },
        { name: 'Settings', icon: <MdSettings />, path: '/settings' },
    ];

    if (user.role === 'admin') {
        navItems.push({ name: 'Admin Panel', icon: <MdToken />, path: '/admin/dashboard', badge: 'New' });
    }

    return (
        <div className={`flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 font-display ${darkMode ? 'dark' : ''}`}>

            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full fixed left-0 top-0 z-20">
                <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                        <MdToken className="text-primary text-3xl" />
                        <span className="text-xl font-bold tracking-wide">WorkPulse</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center px-4 py-3 rounded-lg transition-colors group ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-primary'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <span className={`mr-3 text-xl ${isActive ? 'text-primary' : 'group-hover:text-primary'}`}>{item.icon}</span>
                                <span className="font-medium">{item.name}</span>
                                {item.badge && (
                                    <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-100">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden">
                            {/* Replace with actual image */}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name || 'User'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{user.role || 'Employee'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            title="Logout"
                        >
                            <MdLogout className="text-xl" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 flex flex-col h-full relative overflow-y-auto scroll-smooth">

                {/* Header */}
                <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center md:hidden">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 text-gray-600 dark:text-gray-300">
                            <MdMenu className="text-2xl" />
                        </button>
                        <MdToken className="text-primary text-2xl mr-2" />
                        <h1 className="font-bold text-lg">WorkPulse</h1>
                    </div>

                    <div className="hidden md:block">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Good Morning, {user.name?.split(' ')[0] || 'User'}! ☀️</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-gray-500 hover:text-primary dark:text-gray-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <MdNotifications className="text-xl" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white dark:border-gray-800"></span>
                        </button>
                        <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            {darkMode ? <MdLightMode className="text-xl" /> : <MdDarkMode className="text-xl" />}
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex-1">
                    {children}
                </div>

            </main>

            {/* Mobile Sidebar Overlay (Simplified) */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)}></div>
            )}
        </div>
    );
};

export default DashboardLayout;
