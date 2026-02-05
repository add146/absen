import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { MdDashboard, MdPeople, MdLocationOn, MdAssessment, MdLogout, MdCheckCircle, MdShoppingCart, MdInventory, MdShowChart, MdStars, MdSecurity, MdDarkMode, MdLightMode, MdSettings, MdDomain } from 'react-icons/md';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { darkMode, toggleTheme } = useTheme();

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        navigate('/login');
    };

    const menuItems = [
        { path: '/admin/dashboard', icon: <MdDashboard size={20} />, label: 'Dashboard' },
        { path: '/admin/employees', icon: <MdPeople size={20} />, label: 'Employees' },
        { path: '/admin/locations', icon: <MdLocationOn size={20} />, label: 'Locations' },
        { path: '/admin/approvals', icon: <MdCheckCircle size={20} />, label: 'Approvals' },
        { path: '/admin/reports', icon: <MdAssessment size={20} />, label: 'Reports' },
        { path: '/admin/analytics', icon: <MdShowChart size={20} />, label: 'Analytics' },
        { path: '/admin/products', icon: <MdInventory size={20} />, label: 'Products' },
        { path: '/admin/orders', icon: <MdShoppingCart size={20} />, label: 'Orders' },
        { path: '/admin/point-rules', icon: <MdStars size={20} />, label: 'Point Rules' },
        { path: '/admin/fraud-detection', icon: <MdSecurity size={20} />, label: 'Fraud Detection' },
        { path: '/admin/settings', icon: <MdSettings size={20} />, label: 'Settings' },
    ];

    // Check if user is owner to show Custom Domains
    const userData = localStorage.getItem('user_data');
    if (userData && JSON.parse(userData).role === 'owner') {
        menuItems.splice(10, 0, { path: '/admin/domains', icon: <MdDomain size={20} />, label: 'Domains' });
    }

    return (
        <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col border-r border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                    <MdSecurity className="text-3xl text-blue-600 dark:text-blue-400" />
                    <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Absen Admin</h1>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname === item.path
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center space-x-3 p-3 w-full text-left text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        {darkMode ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
                        <span className="font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 p-3 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <MdLogout size={20} />
                        <span className="font-medium">Logout</span>
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

export default AdminLayout;
