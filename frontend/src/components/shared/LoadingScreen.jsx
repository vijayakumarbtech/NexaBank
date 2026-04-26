import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary)', gap: '20px'
    }}>
      <div style={{ position: 'relative', width: '60px', height: '60px' }}>
        <div style={{
          position: 'absolute', inset: 0, border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{
          position: 'absolute', inset: '8px', border: '2px solid var(--border)',
          borderBottomColor: 'var(--purple)', borderRadius: '50%',
          animation: 'spin 1.2s linear infinite reverse'
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>NexaBank</span>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading secure session...</span>
    </div>
  );
}
