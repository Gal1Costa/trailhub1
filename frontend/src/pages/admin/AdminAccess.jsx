import React, { useEffect, useState } from 'react';
import api from '../../api';
import { auth, signInWithEmailAndPassword, onAuthStateChanged } from '../../firebase';
import { useNavigate, Navigate } from 'react-router-dom';
import './AdminAccess.css';
import LoadingSkeleton from './components/LoadingSkeleton';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADMIN ACCESS PAGE - THE ONLY PUBLIC ADMIN ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * This is the MANDATORY entry point for admin authentication.
 * All admin access must go through this page first.
 * 
 * ROUTE: /admin/access (public, no guard required)
 * 
 * SECURITY RULES (NON-NEGOTIABLE):
 * 1. This is the ONLY admin route accessible without authentication
 * 2. Always renders login form for non-authenticated users
 * 3. Backend API (/me) verifies admin status after login
 * 4. Non-admin logins are rejected with error message
 * 5. Successful admin login redirects to /admin/dashboard
 * 6. Already-authenticated admins are auto-redirected to /admin/dashboard
 * 
 * AUTHENTICATION FLOWS:
 * 
 * FLOW 1: Unauthenticated User Visits /admin/access
 * ┌─ User navigates to /admin/access
 * ├─ onAuthStateChanged fires → user = null
 * ├─ setIsAdmin(false), setChecking(false)
 * └─ ✅ Render login form
 * 
 * FLOW 2: Already Authenticated Admin Visits /admin/access
 * ┌─ User navigates to /admin/access
 * ├─ onAuthStateChanged fires → user exists
 * ├─ Call verifyAdmin() → GET /me
 * ├─ Backend returns role === 'admin'
 * ├─ setIsAdmin(true)
 * └─ ✅ <Navigate to="/admin/dashboard" /> (auto-redirect)
 * 
 * FLOW 3: Non-Admin Logs In at /admin/access
 * ┌─ User enters credentials and submits form
 * ├─ signInWithEmailAndPassword() → Firebase auth succeeds
 * ├─ Call verifyAdmin() → GET /me
 * ├─ Backend returns role !== 'admin'
 * ├─ ❌ Show error: "This portal is for administrators only"
 * ├─ auth.signOut() (force logout)
 * └─ ❌ Stay on /admin/access (no redirect)
 * 
 * FLOW 4: Admin Successfully Logs In at /admin/access
 * ┌─ User enters admin credentials and submits form
 * ├─ signInWithEmailAndPassword() → Firebase auth succeeds
 * ├─ Force token refresh: getIdToken(true)
 * ├─ Call verifyAdmin() → GET /me
 * ├─ Backend returns role === 'admin'
 * ├─ Dispatch 'admin:signedin' event
 * └─ ✅ navigate('/admin/dashboard', { replace: true })
 * 
 * FLOW 5: Deleted Account Attempts Login
 * ┌─ User enters credentials for deleted account
 * ├─ signInWithEmailAndPassword() → Firebase auth succeeds
 * ├─ Call verifyAdmin() → GET /me
 * ├─ Backend returns 401 with error: "Account deleted"
 * ├─ auth.signOut() (force logout)
 * ├─ ❌ Show error: "This account has been deleted..."
 * └─ ❌ Stay on /admin/access
 * 
 * CRITICAL SECURITY FEATURES:
 * - Backend /me endpoint is the SINGLE SOURCE OF TRUTH
 * - Non-admin users are IMMEDIATELY signed out after failed verification
 * - No client-side role manipulation possible
 * - Token is forcefully refreshed before admin verification
 * - Deleted accounts cannot access admin area
 * - Auto-redirect only happens for verified admins
 * 
 * IMPORTANT:
 * - This page NEVER redirects to /admin (that redirects back here)
 * - This page ONLY redirects to /admin/dashboard (after verification)
 * - Non-admins NEVER see admin UI (they stay on this page with error)
 * - Loading skeleton shown while checking initial auth state
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

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

      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <LoadingSkeleton rows={3} cols={2} />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;

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
