import React, { useEffect, useState } from 'react';
import api from '../../api';
import { auth, signInWithEmailAndPassword, onAuthStateChanged } from '../../firebase';
import { useNavigate, Navigate } from 'react-router-dom';
import './AdminAccess.css';
import LoadingSkeleton from './components/LoadingSkeleton';

export default function AdminAccess() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  async function verifyAdmin() {
    // Server is the source of truth for role
    const res = await api.get('/me');
    return res?.data?.role === 'admin';
  }

  useEffect(() => {
    let alive = true;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!alive) return;

      if (!u) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        const ok = await verifyAdmin();
        if (!alive) return;
        setIsAdmin(ok);
      } catch (e) {
        if (!alive) return;
        setIsAdmin(false);
      } finally {
        if (alive) setChecking(false);
      }
    });

    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ensure token is fresh before backend role check
      if (auth.currentUser?.getIdToken) {
        await auth.currentUser.getIdToken(true);
      }

      // SECURITY: Verify admin status by UID (single source of truth)
      let ok = false;
      try {
        ok = await verifyAdmin();
      } catch (serverErr) {
        // Check if account is deleted
        if (serverErr?.response?.status === 401 && 
            serverErr?.response?.data?.error === 'Account deleted') {
          await auth.signOut();
          setError('This account has been deleted and cannot be used to log in.');
          setLoading(false);
          return;
        }
        ok = false;
      }

      if (!ok) {
        setError('This portal is for administrators only.');
        // IMPORTANT: log them out so they can't land in admin accidentally
        try { await auth.signOut(); } catch (e) {}
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        window.dispatchEvent(new CustomEvent('admin:signedin', { detail: { user: { email } } }));
      } catch (e) {}

      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err?.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <LoadingSkeleton rows={3} cols={2} />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="admin-access-bg">
      <div className="admin-access-card">
        <div className="admin-access-icon">🔐</div>
        <h2>Admin Access</h2>
        <p className="muted">Only allowlisted admin accounts can access the dashboard.</p>

        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <label className="field-label">Email</label>
          <input
            className="field-input"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <div className="error">{error}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/explore')}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Working…' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
