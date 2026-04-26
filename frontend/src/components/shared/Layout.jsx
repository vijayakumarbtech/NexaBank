import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LayoutDashboard, ArrowLeftRight, Shield, LogOut, Wifi, WifiOff, Menu, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = {
  user: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  ],
  manager: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { path: '/manager', icon: Shield, label: 'Risk Center' },
  ],
  admin: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { path: '/manager', icon: Shield, label: 'Risk Center' },
    { path: '/admin', icon: BarChart3, label: 'Admin Panel' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out securely');
    navigate('/login');
  };

  const items = navItems[user?.role] || navItems.user;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div style={{
        width: collapsed ? '64px' : '240px', minHeight: '100vh',
        background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', transition: 'width 0.25s ease',
        overflow: 'hidden', flexShrink: 0, position: 'sticky', top: 0, height: '100vh'
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px', color: 'white'
          }}>N</div>
          {!collapsed && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', whiteSpace: 'nowrap' }}>NexaBank</span>}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {items.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '8px',
                background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                color: active ? '#3b82f6' : 'var(--text-secondary)',
                textDecoration: 'none', fontSize: '14px', fontWeight: active ? 600 : 400,
                transition: 'all 0.2s', whiteSpace: 'nowrap', overflow: 'hidden'
              }}>
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
            {connected ? <Wifi size={14} color="var(--success)" /> : <WifiOff size={14} color="var(--danger)" />}
            {!collapsed && <span style={{ fontSize: '12px', color: connected ? 'var(--success)' : 'var(--danger)' }}>{connected ? 'Live' : 'Offline'}</span>}
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
            borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '14px', width: '100%', transition: 'all 0.2s',
            fontFamily: 'var(--font-body)'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => setCollapsed(!collapsed)} style={{
              padding: '8px', background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Menu size={18} />
            </button>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>
              {items.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{user?.firstName} {user?.lastName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '14px', color: 'white'
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
