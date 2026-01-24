import React from 'react';

export default function LoadingSkeleton({ rows = 4, cols = 6 }) {
  return (
    <div className="data-table-container">
      <div style={{ padding: 16 }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div 
            key={r} 
            style={{ 
              display: 'flex', 
              gap: 12, 
              padding: '16px 0',
              borderBottom: r < rows - 1 ? '1px solid #f3f4f6' : 'none'
            }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <div 
                key={c} 
                style={{ 
                  height: 16, 
                  background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  flex: 1, 
                  borderRadius: 4 
                }} 
              />
            ))}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
