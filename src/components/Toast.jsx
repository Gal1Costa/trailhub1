import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;
  const { message, type } = toast;
  const bg = type === 'success' ? '#059669' : type === 'error' ? '#b91c1c' : '#111827';
  return (
    <div style={{ position: 'fixed', right: 20, top: 80, zIndex: 1200 }}>
      <div style={{ background: bg, color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', minWidth: 200 }}>
        {message}
      </div>
    </div>
  );
}
