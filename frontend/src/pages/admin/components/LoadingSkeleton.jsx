import React from 'react';

export default function LoadingSkeleton({ rows = 4, cols = 6 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 8, padding: 8 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{ height: 14, background: '#eef2ff', flex: 1, borderRadius: 4 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
