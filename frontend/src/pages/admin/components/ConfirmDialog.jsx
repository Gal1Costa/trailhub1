import React, { useState } from 'react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, requireText = false, requiredText = 'DELETE' }) {
  const [input, setInput] = useState('');
  if (!open) return null;

  const canConfirm = requireText ? input.trim() === requiredText : true;

  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <div className="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        {requireText && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
              Type <strong>{requiredText}</strong> to confirm.
            </div>
            <input
              aria-label="confirmation-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Type ${requiredText} to confirm`}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
        )}
        <div className="confirm-actions" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={!canConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
