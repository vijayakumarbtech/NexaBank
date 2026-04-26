import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { transactionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowUpRight, ArrowDownLeft, Filter, Plus, Send, Shield } from 'lucide-react';
import TransferModal from '../components/transactions/TransferModal';

const statusBadge = (status) => {
  const map = { SUCCESS: 'badge-success', FAILED: 'badge-danger', BLOCKED: 'badge-danger', MANAGER_REVIEW: 'badge-info', OTP_PENDING: 'badge-warning', FRAUD_CHECK: 'badge-warning', PENDING: 'badge-warning', INITIATED: 'badge-neutral' };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status?.replace('_', ' ')}</span>;
};

const riskBadge = (level) => {
  const map = { SAFE: 'badge-success', SUSPICIOUS: 'badge-warning', HIGH_RISK: 'badge-danger', BLOCKED: 'badge-danger' };
  return level ? <span className={`badge ${map[level] || 'badge-neutral'}`}>{level}</span> : null;
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState({ status: '', type: '' });
  const [showTransfer, setShowTransfer] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionAPI.getAll({ page, limit: 15, ...filter });
      setTransactions(res.data.transactions || []);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [page, filter]);

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>Transactions</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{total} total transactions</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowTransfer(true)}>
            <Send size={16} /> New Transfer
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select className="form-select" style={{ width: 'auto' }} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="BLOCKED">Blocked</option>
            <option value="MANAGER_REVIEW">Under Review</option>
            <option value="OTP_PENDING">OTP Pending</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
            <option value="">All Types</option>
            <option value="transfer">Transfer</option>
            <option value="payment">Payment</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>From / To</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No transactions found</td></tr>
                ) : (
                  transactions.map(txn => {
                    const isSender = txn.fromUser?._id === user?._id || txn.fromUser === user?._id;
                    return (
                      <tr key={txn._id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{txn.transactionId?.slice(0, 16)}...</td>
                        <td style={{ textTransform: 'capitalize' }}>{txn.type}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isSender ? <ArrowUpRight size={14} color="var(--danger)" /> : <ArrowDownLeft size={14} color="var(--success)" />}
                            <span style={{ fontSize: '13px' }}>{isSender ? txn.toUser?.firstName + ' ' + txn.toUser?.lastName : txn.fromUser?.firstName + ' ' + txn.fromUser?.lastName || 'System'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: isSender ? 'var(--danger)' : 'var(--success)' }}>
                          {isSender ? '-' : '+'}${txn.amount?.toFixed(2)}
                        </td>
                        <td>{statusBadge(txn.status)}</td>
                        <td>
                          {txn.riskLevel && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {riskBadge(txn.riskLevel)}
                              {txn.riskScore > 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{txn.riskScore}</span>}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(txn.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span style={{ padding: '6px 12px', fontSize: '14px', color: 'var(--text-muted)' }}>{page} / {pages}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>Next</button>
            </div>
          )}
        </div>
      </div>

      {showTransfer && (
        <TransferModal onClose={() => setShowTransfer(false)} onSuccess={() => { setShowTransfer(false); fetchTransactions(); }} />
      )}
    </Layout>
  );
}
