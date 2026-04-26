import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Users, Shield,
  Link2, LogOut, Bell, Menu, X, ChevronRight, UserCircle,
  AlertTriangle, Settings
} from 'lucide-react';

const navItems = {
  user: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ],
  manager: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/manager', icon: AlertTriangle, label: 'Approvals' },
    { to: '/admin/fraud', icon: Shield, label: 'Fraud Logs' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ],
  admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin', icon: Settings, label: 'Admin Panel' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/fraud', icon: Shield, label: 'Fraud Analytics' },
    { to: '/admin/blockchain', icon: Link2, label: 'Blockchain Logs' },
    { to: '/manager', icon: AlertTriangle, label: 'Approvals' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
  ]
};

const RiskBadge = ({ level }) => {
  const colors = {
    SAFE: 'text-green-400',
    SUSPICIOUS: 'text-yellow-400',
    HIGH_RISK: 'text-orange-400',
    BLOCKED: 'text-red-400'
  };
  return <span className={`text-xs font-semibold ${colors[level] || 'text-slate-400'}`}>{level}</span>;
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications() || {};
  const location = useLocation();
  const navigate = useNavigate();

  const items = navItems[user?.role] || navItems.user;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">SecureBank</p>
          <p className="text-xs text-slate-400 capitalize">{user?.role} Portal</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-2">
        <div className="px-3 py-3 bg-slate-800 rounded-lg">
          <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          {user?.riskLevel && <RiskBadge level={user.riskLevel} />}
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 border-r border-slate-800">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full bg-slate-900 border-r border-slate-800">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-4 lg:px-8 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-sm text-slate-400">
              Welcome back, <span className="text-white font-medium">{user?.firstName}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
