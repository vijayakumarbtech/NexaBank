import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import { userAPI, transactionAPI } from '../services/api';
import { ArrowUpRight, ArrowDownLeft, Shield, TrendingUp, Bell, Plus, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import TransferModal from '../components/transactions/TransferModal';
import toast from 'react-hot-toast';

const StatCard = ({ label, value, sub, icon: Icon, color = 'var(--accent)', trend }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</p>
        <p style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-display)', color }}>{value}</p>
        {sub && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</p>}
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  </div>
);

const TxnRow = ({ txn, userId }) => {
  const isSender = txn.fromUser?._id === userId || txn.fromUser === userId;
  const amount = isSender ? `-$${txn.amount.toFixed(2)}` : `+$${txn.amount.toFixed(2)}`;
  const amtColor = isSender ? 'var(--danger)' : 'var(--success)';
  const statusColors = { SUCCESS: 'var(--success)', FAILED: 'var(--danger)', BLOCKED: 'var(--danger)', MANAGER_REVIEW: 'var(--info)', PENDING: 'var(--warning)', OTP_PENDING: 'var(--warning)', FRAUD_CHECK: 'var(--warning)', INITIATED: 'var(--text-muted)' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isSender ? 'var(--danger-bg)' : 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isSender ? <ArrowUpRight size={18} color="var(--danger)" /> : <ArrowDownLeft size={18} color="var(--success)" />}
        </div>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 500 }}>{txn.description || txn.type}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(txn.createdAt).toLocaleDateString()} · {txn.transactionId?.slice(0, 12)}...</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: amtColor }}>{amount}</p>
        <p style={{ fontSize: '12px', color: statusColors[txn.status] || 'var(--text-muted)' }}>{txn.status?.replace('_', ' ')}</p>
      </div>
    </div>
  );
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [balRes, txnRes, notifRes, riskRes] = await Promise.allSettled([
        userAPI.getBalance(),
        transactionAPI.getAll({ limit: 8 }),
        userAPI.getNotifications({ limit: 5 }),
        userAPI.getRisk(),
      ]);
      if (balRes.status === 'fulfilled') setBalance(balRes.value.data.balance);
      if (txnRes.status === 'fulfilled') setTransactions(txnRes.value.data.transactions || []);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.notifications || []);
      if (riskRes.status === 'fulfilled') setRiskData(riskRes.value.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const riskLevel = riskData?.recentAnalysis?.[0]?.riskLevel || 'SAFE';
  const riskColors = { SAFE: 'var(--success)', SUSPICIOUS: 'var(--warning)', HIGH_RISK: '#f97316', BLOCKED: 'var(--danger)' };

  return (
    <Layout>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Welcome */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.firstName}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Account: {user?.accountNumber}</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowTransfer(true)}>
              <Send size={16} /> Send Money
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <StatCard label="Available Balance" value={`$${(balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} sub={`Account: ${user?.accountNumber}`} icon={TrendingUp} color="var(--accent)" />
            <StatCard label="Total Transactions" value={transactions.length} sub="Last 8 transactions shown" icon={ArrowUpRight} color="var(--purple)" />
            <StatCard label="Risk Score" value={riskData?.riskScore ?? 0} sub={riskLevel} icon={Shield} color={riskColors[riskLevel] || 'var(--success)'} />
            <StatCard label="Fraud Flags" value={riskData?.previousFraudFlags ?? 0} sub="Total detected" icon={AlertTriangle} color={riskData?.previousFraudFlags > 0 ? 'var(--danger)' : 'var(--success)'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
            {/* Transactions */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Recent Transactions</h2>
                <a href="/transactions" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
              </div>
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <ArrowUpRight size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                  <p>No transactions yet</p>
                </div>
              ) : (
                transactions.map(txn => <TxnRow key={txn._id} txn={txn} userId={user?._id} />)
              )}
            </div>

            {/* Notifications */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Alerts</h2>
                <Bell size={18} color="var(--text-muted)" />
              </div>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Bell size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                  <p>No alerts</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notifications.map(n => (
                    <div key={n._id} style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', opacity: n.isRead ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        {n.type === 'fraud_alert' ? <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} /> : <CheckCircle size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />}
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600 }}>{n.title}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <TransferModal onClose={() => setShowTransfer(false)} onSuccess={() => { setShowTransfer(false); fetchData(); }} />
      )}
    </Layout>
  );
}
