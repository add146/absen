import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    const user = userData ? JSON.parse(userData) : null;

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin' && user?.role !== 'owner' && user?.role !== 'super_admin') {
        // Redirect non-admin/non-owner users to employee dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
