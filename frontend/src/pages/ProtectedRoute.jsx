import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, onAuthStateChanged } from '../firebase';
import api from '../api';

/**
 * ProtectedRoute - Prevents admins from accessing regular user pages
 * Redirects admins to /admin/dashboard
 */
export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkRole = async (user) => {
      if (!user) {
        if (mounted) {
          setRole(null);
          setChecking(false);
        }
        return;
      }

      try {
        const res = await api.get('/me').catch(() => api.get('/profile'));
        // Double-check that user is still authenticated before redirecting
        // This prevents race conditions where admin is signed out immediately after login
        if (mounted && auth.currentUser) {
          setRole(res?.data?.role || null);
          setChecking(false);
        } else if (mounted) {
          // User was signed out during the check, don't redirect
          setRole(null);
          setChecking(false);
        }
      } catch (err) {
        console.error('[ProtectedRoute] Failed to check role:', err);
        if (mounted) {
          setRole(null);
          setChecking(false);
        }
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      checkRole(user);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  if (checking) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  // If user is admin, redirect to admin dashboard
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Otherwise, allow access
  return children;
}
