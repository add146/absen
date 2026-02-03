import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    const user = userData ? JSON.parse(userData) : null;

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin') {
        // Redirect non-admin users to employee dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
