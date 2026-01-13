import React, { useEffect, useMemo, useState } from 'react';

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message = '',
  onConfirm,
  onCancel,
  requireText = false,
  requireTyping = false,
  requiredText = 'DELETE',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmLoading = false,
}) {
  const [input, setInput] = useState('');

  // Clear typing field whenever dialog opens/closes
  useEffect(() => {
    if (!open) setInput('');
    if (open) setInput('');
  }, [open]);

  if (!open) return null;

  const needsTyping = useMemo(() => requireText || requireTyping, [requireText, requireTyping]);

  const canConfirm = useMemo(() => {
    if (!needsTyping) return true;
    return input.trim() === requiredText;
  }, [needsTyping, input, requiredText]);

  const handleConfirm = () => {
    if (!canConfirm || confirmLoading) return;
    if (typeof onConfirm === 'function') onConfirm();
  };

  const handleCancel = () => {
    if (confirmLoading) return;
    if (typeof onCancel === 'function') onCancel();
  };

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleCancel();
        if (e.key === 'Enter') handleConfirm();
      }}
      tabIndex={-1}
    >
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-title">{title}</div>

        <div className="confirm-message">
          {typeof message === 'string' ? <p style={{ margin: 0 }}>{message}</p> : message}
        </div>

        {needsTyping && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
              Type <strong>{requiredText}</strong> to confirm.
            </div>
            <input
              aria-label="confirmation-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Type ${requiredText} to confirm`}
              style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
        )}

        <div className="confirm-actions" style={{ marginTop: 12 }}>
          <button className="btn" onClick={handleCancel} disabled={confirmLoading}>
            {cancelText}
          </button>
          <button
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={!canConfirm || confirmLoading}
          >
            {confirmLoading ? 'Working...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
