import React, { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { transactionAPI } from '../services/api';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManagerDashboard() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [approving, setApproving] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await transactionAPI.getPending();
      setPending(res.data.transactions || []);
    } catch (err) {
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleDecision = async (approved) => {
    if (!selected) return;
    setApproving(true);
    try {
      await transactionAPI.approve({ transactionId: selected.transactionId, approved, note });
      toast.success(`Transaction ${approved ? 'approved' : 'rejected'}`);
      setSelected(null);
      setNote('');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setApproving(false);
    }
  };

  const riskColor = { SAFE: 'var(--success)', SUSPICIOUS: 'var(--warning)', HIGH_RISK: '#f97316', BLOCKED: 'var(--danger)' };

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>Risk Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Review and approve flagged transactions</p>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div className="card">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Pending Review</p>
            <p style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>{pending.length}</p>
          </div>
          <div className="card">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>High Risk Items</p>
            <p style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--danger)' }}>
              {pending.filter(t => t.riskLevel === 'HIGH_RISK').length}
            </p>
          </div>
          <div className="card">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Suspicious</p>
            <p style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>
              {pending.filter(t => t.riskLevel === 'SUSPICIOUS').length}
            </p>
          </div>
          <div className="card">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Volume</p>
            <p style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
              ${pending.reduce((s, t) => s + t.amount, 0).toFixed(0)}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: '24px' }}>
          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={18} color="var(--warning)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>Pending Approvals</h2>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Risk Level</th>
                    <th>Risk Score</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                  ) : pending.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <CheckCircle size={32} style={{ marginBottom: '8px', opacity: 0.3 }} /><br />No pending approvals
                    </td></tr>
                  ) : pending.map(txn => (
                    <tr key={txn._id} onClick={() => setSelected(txn)} style={{ cursor: 'pointer', background: selected?._id === txn._id ? 'var(--bg-card-hover)' : undefined }}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 500 }}>{txn.fromUser?.firstName} {txn.fromUser?.lastName}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{txn.fromUser?.email}</p>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '16px' }}>${txn.amount?.toFixed(2)}</td>
                      <td><span className={`badge ${txn.riskLevel === 'HIGH_RISK' ? 'badge-danger' : 'badge-warning'}`}>{txn.riskLevel}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ width: `${txn.riskScore}%`, height: '100%', background: riskColor[txn.riskLevel], borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '13px', color: riskColor[txn.riskLevel] }}>{txn.riskScore}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(txn.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(txn); }}>
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="card" style={{ animation: 'slideIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700 }}>Review Details</h3>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {[
                  ['Transaction ID', selected.transactionId?.slice(0, 16) + '...'],
                  ['User', `${selected.fromUser?.firstName} ${selected.fromUser?.lastName}`],
                  ['Email', selected.fromUser?.email],
                  ['Amount', `$${selected.amount?.toFixed(2)}`],
                  ['Type', selected.type],
                  ['Risk Score', `${selected.riskScore}/100`],
                  ['Risk Level', selected.riskLevel],
                  ['Fraud Probability', `${((selected.fraudProbability || 0) * 100).toFixed(1)}%`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>

              {selected.riskFactors?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Risk Factors:</p>
                  {selected.riskFactors.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <AlertTriangle size={12} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Manager Note</label>
                <textarea className="form-input" rows={3} placeholder="Add a review note..." value={note} onChange={e => setNote(e.target.value)} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleDecision(false)} className="btn btn-danger" style={{ flex: 1 }} disabled={approving}>
                  <XCircle size={16} /> Reject
                </button>
                <button onClick={() => handleDecision(true)} className="btn btn-success" style={{ flex: 1 }} disabled={approving}>
                  {approving ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : <><CheckCircle size={16} /> Approve</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
