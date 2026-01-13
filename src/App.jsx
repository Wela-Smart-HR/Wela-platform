import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext'; 
import useSwipeBack from './hooks/useSwipeBack';

// --- LAYOUTS ---
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';

// --- PAGES (COMMON) ---
import Login from './pages/Login';
import SignUp from './pages/SignUp';

// --- PAGES (ADMIN) ---
import Dashboard from './pages/admin/Dashboard';
import Schedule from './pages/admin/Schedule';
import Reports from './pages/admin/Reports';
import Payroll from './pages/admin/Payroll';
import Settings from './pages/admin/Settings';
import People from './pages/admin/People';
import Requests from './pages/admin/Requests'; // ✅ อย่าลืมหน้านี้

// --- PAGES (EMPLOYEE) ---
import Connect from './pages/employee/Connect';
import TimeAttendance from './pages/employee/TimeAttendance';
import MyRequests from './pages/employee/MyRequests';
import Payslip from './pages/employee/Payslip';
import Profile from './pages/employee/Profile';
import MyWork from './pages/employee/MyWork';

const SwipeHandler = () => { useSwipeBack(); return null; };

const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" />;

  if (allowedRole && currentUser.role !== allowedRole) {
    if (currentUser.role === 'owner') return <Navigate to="/" />;
    return <Navigate to="/connect" />;
  }

  return children;
};

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <SwipeHandler />
          <Routes>
            {/* PUBLIC */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* 🔴 ADMIN ROUTES */}
            <Route element={
              <ProtectedRoute allowedRole="owner">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/people" element={<People />} />
              <Route path="/requests" element={<Requests />} />
            </Route>

            {/* 🟢 EMPLOYEE ROUTES */}
            <Route path="/connect" element={
              <ProtectedRoute allowedRole="employee">
                <EmployeeLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Connect />} />
              <Route path="time" element={<TimeAttendance />} />
              <Route path="requests" element={<MyRequests />} />
              <Route path="payslip" element={<Payslip />} />
              <Route path="profile" element={<Profile />} />
              <Route path="my-work" element={<MyWork />} />
            </Route>

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;