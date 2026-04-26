import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { adminAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, TrendingUp, Shield, AlertTriangle, RefreshCw, CheckCircle, XCircle, Lock, Unlock, Database } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Users', 'Fraud Logs', 'Blockchain', 'Login Attempts'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [fraudLogs, setFraudLogs] = useState([]);
  const [blockchain, setBlockchain] = useState(null);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [chainValid, setChainValid] = useState(null);

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'Overview') {
        const res = await adminAPI.getDashboard();
        setStats(res.data.stats);
      } else if (tab === 'Users') {
        const res = await adminAPI.getUsers({ limit: 30 });
        setUsers(res.data.users);
      } else if (tab === 'Fraud Logs') {
        const res = await adminAPI.getFraudLogs({ limit: 30 });
        setFraudLogs(res.data.logs);
      } else if (tab === 'Blockchain') {
        const [chainRes, validRes] = await Promise.all([adminAPI.getBlockchain(), adminAPI.validateBlockchain()]);
        setBlockchain(chainRes.data);
        setChainValid(validRes.data.is_valid);
      } else if (tab === 'Login Attempts') {
        const res = await adminAPI.getLoginAttempts({ limit: 30 });
        setLoginAttempts(res.data.attempts);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await adminAPI.updateRole(userId, role);
      toast.success('Role updated');
      setUsers(users.map(u => u._id === userId ? { ...u, role } : u));
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await adminAPI.toggleStatus(userId);
      toast.success(`User ${res.data.isActive ? 'activated' : 'deactivated'}`);
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: res.data.isActive } : u));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)', color }}>{value}</p>
        </div>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u =>
    !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>Admin Panel</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>System-wide analytics and controls</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: tab === t ? 600 : 400, fontFamily: 'var(--font-body)',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              marginBottom: '-1px', transition: 'color 0.2s'
            }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={14} /></button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg" /></div>
        ) : (
          <>
            {/* Overview */}
            {tab === 'Overview' && stats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="var(--accent)" />
                  <StatCard label="Transactions" value={stats.totalTransactions} icon={TrendingUp} color="var(--purple)" />
                  <StatCard label="Fraud Alerts" value={stats.fraudAlerts} icon={Shield} color="var(--danger)" />
                  <StatCard label="Blocked Txns" value={stats.blockedTransactions} icon={AlertTriangle} color="#f97316" />
                  <StatCard label="Volume (USD)" value={`$${(stats.totalVolume || 0).toLocaleString()}`} icon={TrendingUp} color="var(--success)" />
                  <StatCard label="Pending Review" value={stats.pendingReview} icon={Shield} color="var(--warning)" />
                </div>
                {stats.txnByDay?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="card">
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Transaction Volume (7d)</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.txnByDay}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                          <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card">
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Transaction Count (7d)</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={stats.txnByDay}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="_id" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {stats.recentFraud?.length > 0 && (
                  <div className="card">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Recent Fraud Alerts</h3>
                    <table><thead><tr><th>User</th><th>Risk Score</th><th>Risk Level</th><th>Action</th><th>Date</th></tr></thead>
                      <tbody>
                        {stats.recentFraud.map(log => (
                          <tr key={log._id}>
                            <td>{log.userId?.firstName} {log.userId?.lastName}</td>
                            <td><span style={{ color: log.riskScore > 60 ? 'var(--danger)' : 'var(--warning)' }}>{log.riskScore}/100</span></td>
                            <td><span className={`badge ${log.riskLevel === 'BLOCKED' || log.riskLevel === 'HIGH_RISK' ? 'badge-danger' : 'badge-warning'}`}>{log.riskLevel}</span></td>
                            <td><span className="badge badge-neutral">{log.action}</span></td>
                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Users */}
            {tab === 'Users' && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input className="form-input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '280px' }} />
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{filteredUsers.length} users</span>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Account</th><th>Balance</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u._id}>
                          <td style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{u.accountNumber}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>${(u.balance || 0).toFixed(2)}</td>
                          <td>
                            <select value={u.role} onChange={e => handleRoleChange(u._id, e.target.value)}
                              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                              <option value="user">User</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>
                            <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td>
                            <button onClick={() => handleToggleStatus(u._id)} className="btn btn-ghost btn-sm" title={u.isActive ? 'Deactivate' : 'Activate'}>
                              {u.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fraud Logs */}
            {tab === 'Fraud Logs' && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700 }}>Fraud Detection Logs ({fraudLogs.length})</h3>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>User</th><th>Risk Score</th><th>Risk Level</th><th>Probability</th><th>Action</th><th>Risk Factors</th><th>Date</th></tr></thead>
                    <tbody>
                      {fraudLogs.map(log => (
                        <tr key={log._id}>
                          <td>
                            <div><p style={{ fontWeight: 500 }}>{log.userId?.firstName} {log.userId?.lastName}</p>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.userId?.email}</p></div>
                          </td>
                          <td style={{ fontWeight: 700, color: log.riskScore > 60 ? 'var(--danger)' : log.riskScore > 30 ? 'var(--warning)' : 'var(--success)' }}>{log.riskScore}</td>
                          <td><span className={`badge ${log.riskLevel === 'BLOCKED' || log.riskLevel === 'HIGH_RISK' ? 'badge-danger' : log.riskLevel === 'SUSPICIOUS' ? 'badge-warning' : 'badge-success'}`}>{log.riskLevel}</span></td>
                          <td>{((log.fraudProbability || 0) * 100).toFixed(1)}%</td>
                          <td><span className="badge badge-neutral">{log.action}</span></td>
                          <td style={{ maxWidth: '200px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.riskFactors?.slice(0, 2).join('; ')}{log.riskFactors?.length > 2 ? '...' : ''}</span>
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Blockchain */}
            {tab === 'Blockchain' && blockchain && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div className="card" style={{ flex: 1, padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <Database size={24} color={chainValid ? 'var(--success)' : 'var(--danger)'} />
                    <div>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Chain Integrity</p>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: chainValid ? 'var(--success)' : 'var(--danger)' }}>
                        {chainValid ? '✓ Valid' : '✗ Tampered!'}
                      </p>
                    </div>
                  </div>
                  <div className="card" style={{ flex: 1, padding: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Blocks</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>{blockchain.length}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(blockchain.chain || []).slice(-20).reverse().map(block => (
                    <div key={block.index} className="card" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Block #{block.index}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{block.data?.event_type || 'GENESIS'}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{block.timestamp}</span>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>Hash: {block.hash}</span>
                        <span>Prev: {block.previous_hash}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Login Attempts */}
            {tab === 'Login Attempts' && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700 }}>Login Attempts ({loginAttempts.length})</h3>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>User</th><th>IP Address</th><th>Status</th><th>Reason</th><th>Timestamp</th></tr></thead>
                    <tbody>
                      {loginAttempts.map(a => (
                        <tr key={a._id}>
                          <td>{a.userId?.firstName ? `${a.userId.firstName} ${a.userId.lastName}` : a.email}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{a.ipAddress}</td>
                          <td>{a.success ? <span className="badge badge-success"><CheckCircle size={10} />Success</span> : <span className="badge badge-danger"><XCircle size={10} />Failed</span>}</td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{a.failureReason || '-'}</td>
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
