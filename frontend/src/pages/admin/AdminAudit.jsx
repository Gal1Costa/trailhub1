import React, { useEffect, useState } from 'react';
import api from '../../api';
import './AdminDashboard.css';

export default function AdminAudit() {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
      (async () => {
      try {
        const res = await api.get('/admin/audit');
        if (mounted) setLogs(res.data || []);
      } catch (err) {
        console.warn('Failed to load audit logs', err.message || err);
        if (mounted) setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="admin-dashboard">
      <h2>Audit Log</h2>
      {loading ? (
        <div className="placeholder">Loading...</div>
      ) : (
        <div>
          {(!logs || logs.length === 0) ? (
            <div className="placeholder">No audit entries found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>When</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Actor</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Action</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Target</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{new Date(l.createdAt).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{l.actorEmail || l.actorId || 'system'}</td>
                    <td style={{ padding: 8 }}>{l.action}</td>
                    <td style={{ padding: 8 }}>{l.target}</td>
                    <td style={{ padding: 8, maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
