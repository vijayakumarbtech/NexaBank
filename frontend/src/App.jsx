import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import TransactionsPage from './pages/TransactionsPage';
import LoadingScreen from './components/shared/LoadingScreen';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'manager') return <Navigate to="/manager" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <RoleRedirect />} />
      <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <RoleRedirect />} />
      <Route path="/dashboard" element={
        <ProtectedRoute roles={['user', 'manager', 'admin']}>
          <UserDashboard />
        </ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute roles={['user', 'manager', 'admin']}>
          <TransactionsPage />
        </ProtectedRoute>
      } />
      <Route path="/manager" element={
        <ProtectedRoute roles={['manager', 'admin']}>
          <ManagerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/" element={isAuthenticated ? <RoleRedirect /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#111827',
                color: '#f0f4fc',
                border: '1px solid #1e2d45',
                borderRadius: '8px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#111827' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#111827' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
