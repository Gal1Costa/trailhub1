import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, onAuthStateChanged } from '../../firebase';
import api from '../../api';
import LoadingSkeleton from './components/LoadingSkeleton';

/**
 * ADMIN ROUTE GUARD — DO NOT RELAX
 *
 * Security rule:
 * - NO user (visitor or authenticated) may see ANY admin UI at `/admin`
 *   unless they are authenticated AND have role === 'admin'.
 *
 * Behavior:
 * - All non-admin access attempts MUST redirect to `/admin/access`.
 * - `/admin/access` is the ONLY allowed entry point for admin authentication.
 *
 * This is intentional to prevent accidental exposure of admin UI
 * when users navigate directly to `/admin`.
 *
 * IMPORTANT:
 * - Do NOT show "Not Authorized" pages under `/admin`
 * - Do NOT render admin layout conditionally
 * - Always redirect instead
 */

export default function AdminRoute({ children }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const loc = useLocation();

  // Wait for Firebase auth to initialize before verifying admin on server
  useEffect(() => {
    // Listen for auth initialization and get the current user when available
    const unsub = onAuthStateChanged(auth, (u) => {
      console.debug('[AdminRoute] onAuthStateChanged fired, user=', !!u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    let mounted = true;
    (async () => {
      let triedRefresh = false;
      const fetchProfile = async () => {
        try {
          return await api.get('/me');
        } catch (err) {
          // fallback to /profile if /me fails
          try {
            return await api.get('/profile');
          } catch (fallbackErr) {
            throw fallbackErr;
          }
        }
      };

      try {
        const res = await fetchProfile();
        if (!mounted) return;
        console.debug('[AdminRoute] user verify OK, role=', res?.data?.role);

        if (res?.data?.role === 'admin') {
          setRole('admin');
        } else {
          setRole('visitor');
        }
      } catch (err) {
        console.warn('[AdminRoute] initial user verify failed', err?.response?.status || err?.message || err);
        if (auth.currentUser && auth.currentUser.getIdToken && !triedRefresh) {
          triedRefresh = true;
          try {
            await auth.currentUser.getIdToken(true);
            console.debug('[AdminRoute] refreshed ID token after failed verify, retrying');
            const retry = await fetchProfile();
            if (!mounted) return;
            console.debug('[AdminRoute] user verify OK after refresh, role=', retry?.data?.role);

            if (retry?.data?.role === 'admin') {
              setRole('admin');
            } else {
              setRole('visitor');
            }
            return;
          } catch (retryErr) {
            console.warn('[AdminRoute] user verify retry failed', retryErr?.response?.status || retryErr?.message || retryErr);
          }
        }
        if (!mounted) return;
        setRole('visitor');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authReady]);

  if (loading) return <LoadingSkeleton rows={3} cols={4} />;

  if (role === 'admin') return children;

  // For any non-admin (visitor or authenticated non-admin), redirect to Admin Access
  // This ensures users must explicitly sign in from the admin login page first.
  return <Navigate to="/admin/access" state={{ from: loc }} replace />;
}
