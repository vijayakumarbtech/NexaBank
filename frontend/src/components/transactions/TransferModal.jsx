import React, { useState } from 'react';
import { transactionAPI } from '../../services/api';
import { X, Send, AlertCircle, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['details', 'otp', 'result'];

export default function TransferModal({ onClose, onSuccess }) {
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ toAccountNumber: '', amount: '', description: '', type: 'transfer' });
  const [otp, setOtp] = useState('');
  const [displayOtp, setDisplayOtp] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInitiate = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await transactionAPI.initiate({
        toAccountNumber: form.toAccountNumber,
        amount: parseFloat(form.amount),
        type: form.type,
        description: form.description
      });
      setTransactionId(res.data.transactionId);
      setDisplayOtp(res.data.otp);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await transactionAPI.verifyOtp({ transactionId, otp });
      setResult(res.data.transaction);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const riskColors = { SAFE: 'var(--success)', SUSPICIOUS: 'var(--warning)', HIGH_RISK: '#f97316', BLOCKED: 'var(--danger)' };
  const statusIcon = result?.status === 'SUCCESS' ? <CheckCircle size={40} color="var(--success)" /> :
    result?.status === 'BLOCKED' ? <AlertTriangle size={40} color="var(--danger)" /> :
    <Shield size={40} color="var(--info)" />;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', width: '100%', maxWidth: '480px', animation: 'fadeIn 0.3s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>
              {step === 'details' ? 'Send Money' : step === 'otp' ? 'Verify Transaction' : 'Transaction Result'}
            </h2>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ height: '3px', width: '48px', borderRadius: '2px', background: STEPS.indexOf(step) >= i ? 'var(--accent)' : 'var(--border)' }} />
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--danger-bg)', borderRadius: '8px', marginBottom: '16px', color: 'var(--danger)', fontSize: '14px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />{error}
            </div>
          )}

          {step === 'details' && (
            <form onSubmit={handleInitiate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Recipient Account Number</label>
                <input type="text" className="form-input" placeholder="ACC1234567890" value={form.toAccountNumber} onChange={e => setForm({ ...form, toAccountNumber: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (USD)</label>
                <input type="number" className="form-input" placeholder="0.00" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Transaction Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="transfer">Transfer</option>
                  <option value="payment">Payment</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input type="text" className="form-input" placeholder="Payment for..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : <><Send size={16} />Continue</>}
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Transaction ID</p>
                <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{transactionId}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Amount</p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger)', marginTop: '2px' }}>-${parseFloat(form.amount).toFixed(2)}</p>
              </div>
              {displayOtp && (
                <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--success)' }}>
                  🔑 Dev OTP: <strong style={{ fontSize: '18px', letterSpacing: '4px' }}>{displayOtp}</strong>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Enter OTP</label>
                <input type="text" className="form-input" placeholder="000000" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setStep('details')} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || otp.length !== 6}>
                  {loading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Verify & Send'}
                </button>
              </div>
            </form>
          )}

          {step === 'result' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
              {statusIcon}
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>
                  {result.status === 'SUCCESS' ? 'Transaction Successful' : result.status === 'BLOCKED' ? 'Transaction Blocked' : 'Under Review'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>{result.recommendation}</p>
              </div>
              <div style={{ width: '100%', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Risk Score</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: riskColors[result.riskLevel] }}>{result.riskScore}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Risk Level</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: riskColors[result.riskLevel] }}>{result.riskLevel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Fraud Probability</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{(result.fraudProbability * 100).toFixed(1)}%</span>
                </div>
                {result.riskFactors?.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Risk Factors:</p>
                    {result.riskFactors.map((f, i) => (
                      <p key={i} style={{ fontSize: '12px', color: 'var(--warning)', marginBottom: '4px' }}>• {f}</p>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={result.status === 'SUCCESS' ? onSuccess : onClose} className="btn btn-primary" style={{ width: '100%' }}>
                {result.status === 'SUCCESS' ? 'Done' : 'Close'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
