import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AttendanceHistory from './pages/AttendanceHistory';
import Rewards from './pages/Rewards';
import LeaveRequest from './pages/LeaveRequest';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import EmployeeManagement from './pages/admin/EmployeeManagement';
import LocationSettings from './pages/admin/LocationSettings';
import AttendanceReports from './pages/admin/AttendanceReports';
import LeaveApproval from './pages/admin/LeaveApproval';
import ProductManagement from './pages/admin/ProductManagement';
import OrderManagement from './pages/admin/OrderManagement';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import PointRulesManagement from './pages/admin/PointRulesManagement';
import FraudDetection from './pages/admin/FraudDetection';
import Settings from './pages/admin/Settings';
import SystemHealth from './pages/admin/SystemHealth';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './layouts/AdminLayout';
import TenantOnboarding from './pages/TenantOnboarding';
import Subscription from './pages/Subscription';
import TenantDashboard from './pages/TenantDashboard';


const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<TenantOnboarding />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><AttendanceHistory /></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
        <Route path="/leaves" element={<ProtectedRoute><LeaveRequest /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
        <Route path="/tenant/dashboard" element={<ProtectedRoute><TenantDashboard /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="locations" element={<LocationSettings />} />
            <Route path="approvals" element={<LeaveApproval />} />
            <Route path="reports" element={<AttendanceReports />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="point-rules" element={<PointRulesManagement />} />
            <Route path="fraud-detection" element={<FraudDetection />} />
            <Route path="settings" element={<Settings />} />
            <Route path="health" element={<SystemHealth />} />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
