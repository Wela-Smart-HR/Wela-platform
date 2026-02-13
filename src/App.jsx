import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { AppProvider } from './contexts/AppContext';
import { DialogProvider } from './contexts/DialogContext';
import { RequestModalProvider } from './contexts/RequestModalContext';
import useSwipeBack from './hooks/useSwipeBack';

// --- LAYOUTS ---
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';

// --- ROUTES ---
import { adminRoutes } from './app/routes/admin.routes';
import { employeeRoutes } from './app/routes/employee.routes';

// --- PAGES (COMMON) ---
import Login from './pages/Login';
import SignUp from './pages/SignUp';

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

function AppContent() {
  const { currentUser } = useAuth();

  return (
    <ConfigProvider companyId={currentUser?.companyId}>
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
            {adminRoutes.map((route, i) => (
              <Route key={i} path={route.path} element={route.element} />
            ))}
          </Route>

          {/* 🟢 EMPLOYEE ROUTES */}
          <Route path="/connect" element={
            <ProtectedRoute allowedRole="employee">
              <EmployeeLayout />
            </ProtectedRoute>
          }>
            {employeeRoutes.map((route, i) => (
              <Route key={i} index={route.index} path={route.path} element={route.element} />
            ))}
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <DialogProvider>
          <RequestModalProvider>
            <AppContent />
          </RequestModalProvider>
        </DialogProvider>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
