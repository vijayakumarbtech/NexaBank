import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await authAPI.register(form);
      toast.success('Account created! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColor = ['transparent', 'var(--danger)', 'var(--warning)', 'var(--success)'][passwordStrength];
  const strengthLabel = ['', 'Weak', 'Medium', 'Strong'][passwordStrength];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: '480px', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} color="white" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, marginBottom: '6px' }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Join NexaBank's secure platform</p>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' }}>
          {error && <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--danger-bg)', borderRadius: '8px', marginBottom: '16px', color: 'var(--danger)', fontSize: '14px' }}><AlertCircle size={16} style={{ flexShrink: 0 }} />{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input type="text" className="form-input" placeholder="John" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-input" placeholder="Doe" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input" placeholder="+1 555 0100" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Min 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
              {form.password && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', alignItems: 'center' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= passwordStrength ? strengthColor : 'var(--border)' }} />
                  ))}
                  <span style={{ fontSize: '12px', color: strengthColor, marginLeft: '4px', minWidth: '40px' }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '8px' }} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Create Account'}
            </button>
          </form>
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
