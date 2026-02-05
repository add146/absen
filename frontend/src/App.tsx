import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FieldWorkerDashboard from './pages/FieldWorkerDashboard';
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
import FieldWorkerVisits from './pages/admin/FieldWorkerVisits';
import SystemHealth from './pages/admin/SystemHealth';
import InvoiceHistory from './pages/admin/InvoiceHistory';
import AdminSettings from './pages/admin/Settings';
import CustomDomains from './pages/admin/CustomDomains';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './layouts/AdminLayout';
import TenantOnboarding from './pages/TenantOnboarding';
import Subscription from './pages/Subscription';
// import TenantDashboard from './pages/TenantDashboard';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import SuperAdminProfile from './pages/superadmin/Profile';
import UserManagement from './pages/superadmin/UserManagement';
import GlobalSettings from './pages/superadmin/GlobalSettings';
import TenantManagement from './pages/superadmin/TenantManagement';
import PlanManagement from './pages/superadmin/PlanManagement';
import PlatformAnalytics from './pages/superadmin/PlatformAnalytics';


import Team from './pages/Team';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

import { ThemeProvider } from './context/ThemeContext';

function App() {
  // Main Router Configuration
  return (
    <Router>
      <ThemeProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<TenantOnboarding />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/field-worker-dashboard" element={<ProtectedRoute><FieldWorkerDashboard /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><AttendanceHistory /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
          <Route path="/leaves" element={<ProtectedRoute><LeaveRequest /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="/tenant/dashboard" element={<Navigate to="/admin/dashboard" replace />} />

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
              <Route path="field-worker-visits" element={<FieldWorkerVisits />} />
              <Route path="invoices" element={<InvoiceHistory />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="domains" element={<CustomDomains />} />
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

          {/* Super Admin Routes */}
          <Route path="/superadmin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="tenants" element={<TenantManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="plans" element={<PlanManagement />} />
            <Route path="analytics" element={<PlatformAnalytics />} />
            <Route path="settings" element={<GlobalSettings />} />
            <Route path="profile" element={<SuperAdminProfile />} />
            <Route path="health" element={<SystemHealth />} />
            <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ThemeProvider>
    </Router>
  );
}

export default App;
