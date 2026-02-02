import React from 'react';

export default function EmptyState({ title = 'No items', description = '' }) {
  return (
    <div style={{ 
      padding: '64px 24px', 
      textAlign: 'center', 
      background: '#f9fafb',
      borderRadius: '12px',
      border: '2px dashed #e5e7eb'
    }}>
      <div style={{ 
        fontSize: 18, 
        fontWeight: 600,
        color: '#374151',
        marginBottom: 8
      }}>
        {title}
      </div>
      {description && (
        <div style={{ 
          color: '#6b7280',
          fontSize: 14,
          lineHeight: 1.6
        }}>
          {description}
        </div>
      )}
    </div>
  );
}
