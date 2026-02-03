import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { MdDashboard, MdPeople, MdLocationOn, MdAssessment, MdLogout, MdArrowBack, MdCheckCircle, MdShoppingCart, MdInventory, MdShowChart, MdStars, MdSecurity, MdSettings, MdMonitorHeart } from 'react-icons/md';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

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

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold text-blue-600">Absen Admin</h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname === item.path
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t space-y-2">
                    <Link
                        to="/dashboard"
                        className="flex items-center space-x-3 p-3 w-full text-left text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <MdArrowBack size={20} />
                        <span className="font-medium">Back to App</span>
                    </Link>

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

export default AdminLayout;
