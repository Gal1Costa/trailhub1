import React, { useState } from 'react';
import api from '../../api';
import AdminLayout from './layouts/AdminLayout';

export default function AdminDevLogin() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const createDefaultAdmin = async () => {
    setMessage({ type: 'error', text: 'Dev admin creation is disabled. Only allowlisted admin users can exist.' });
  };

  return (
    <AdminLayout>
      <div style={{ padding: 20 }}>
        <h2>Dev Admin Helper</h2>
        <p>Dev admin creation is disabled. Only the allowlisted admin account may exist.</p>

        <div style={{ marginTop: 12 }}>
          <button onClick={createDefaultAdmin} className="btn">
            Disabled
          </button>
        </div>

        {message && (
          <div style={{ marginTop: 12, color: message.type === 'error' ? '#b91c1c' : '#064e3b' }}>
            {message.text}
          </div>
        )}

        <div style={{ marginTop: 18, color: '#555' }}>
          Admin access is restricted to the allowlisted email only.
        </div>
      </div>
    </AdminLayout>
  );
}
