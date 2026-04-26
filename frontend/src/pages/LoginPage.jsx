import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, verifyLoginOtp } = useAuth();
  const [step, setStep] = useState('credentials');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [displayOtp, setDisplayOtp] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await login(form.email, form.password);
      setUserId(data.userId);
      setDisplayOtp(data.otp);
      setStep('otp');
      toast.success('OTP generated!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await verifyLoginOtp(userId, otp);
      toast.success('Welcome back!');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '24px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-200px', left: '-200px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-200px', right: '-200px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(59,130,246,0.3)' }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>NexaBank</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Enterprise Banking Platform</p>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' }}>
          {step === 'credentials' ? (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Sign In</h2>
              {error && <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--danger-bg)', borderRadius: '8px', marginBottom: '16px', color: 'var(--danger)', fontSize: '14px' }}><AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />{error}</div>}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required style={{ paddingRight: '44px' }} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '8px' }} disabled={loading}>
                  {loading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Continue to 2FA'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Two-Factor Auth</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Enter the 6-digit OTP to complete login.</p>
              {displayOtp && (
                <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--success)' }}>
                  🔑 Dev Mode OTP: <strong style={{ fontSize: '18px', letterSpacing: '4px' }}>{displayOtp}</strong>
                </div>
              )}
              {error && <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--danger-bg)', borderRadius: '8px', marginBottom: '16px', color: 'var(--danger)', fontSize: '14px' }}><AlertCircle size={16} />{error}</div>}
              <form onSubmit={handleOtpVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">6-Digit OTP</label>
                  <input type="text" className="form-input" placeholder="000000" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }} />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || otp.length !== 6}>
                  {loading ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Verify & Login'}
                </button>
                <button type="button" onClick={() => { setStep('credentials'); setError(''); setOtp(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  ← Back to login
                </button>
              </form>
            </>
          )}
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
            No account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
