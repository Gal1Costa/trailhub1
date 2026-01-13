import React from 'react';

export default function EmptyState({ title = 'No items', description = '' }) {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
      {description && <div style={{ marginTop: 8 }}>{description}</div>}
    </div>
  );
}
