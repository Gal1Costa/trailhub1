import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, onAuthStateChanged } from '../../firebase';
import api from '../../api';
import LoadingSkeleton from './components/LoadingSkeleton';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADMIN ROUTE GUARD - STRICT SECURITY ENFORCEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * This guard protects ALL admin routes (except /admin/access) and ensures
 * ONLY authenticated users with role === 'admin' can access them.
 * 
 * SECURITY RULES (NON-NEGOTIABLE):
 * 1. Backend API (/me) is the SINGLE SOURCE OF TRUTH for admin status
 * 2. No admin UI is EVER rendered without backend verification
 * 3. ALL non-admin access attempts MUST redirect to /admin/access
 * 4. This guard NEVER auto-redirects to /admin/dashboard
 * 5. Loading state shows skeleton (not admin UI) while verifying
 * 
 * PROTECTED ROUTES:
 * - /admin/dashboard
 * - /admin/users
 * - /admin/hikes
 * - /admin/guides
 * - /admin/analytics
 * - /admin/audit
 * - /admin/role-requests
 * - /admin/deleted
 * 
 * AUTHENTICATION FLOW:
 * ┌─ User attempts to access protected route (e.g., /admin/dashboard)
 * │
 * ├─ 1. AdminRoute mounts and waits for Firebase auth to initialize
 * │
 * ├─ 2. Calls backend API: GET /me
 * │     │
 * │     ├─ Returns 401 (not authenticated)
 * │     │  └─ ❌ Redirect to /admin/access
 * │     │
 * │     ├─ Returns 200 with role !== 'admin'
 * │     │  └─ ❌ Redirect to /admin/access
 * │     │
 * │     └─ Returns 200 with role === 'admin'
 * │        └─ ✅ Allow access (render children)
 * │
 * └─ 3. Admin can now access the protected route
 * 
 * IMPORTANT:
 * - This guard does NOT manage the redirect FROM /admin TO /admin/access
 *   (that's handled in main.jsx route config)
 * - This guard ONLY protects individual admin pages
 * - Failed auth checks ALWAYS redirect to /admin/access (never dashboard)
 * - Token refresh is attempted once if initial verification fails
 * 
 * MIDDLEWARE BEHAVIOR:
 * - Shows LoadingSkeleton while checking (not admin UI)
 * - Redirects non-admins immediately after verification
 * - Preserves attempted location in redirect state
 * - Never exposes admin UI to non-admins (not even flash)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default function AdminRoute({ children }) {
  const [role, setRole] = useState(null); // null = checking, 'admin' = allow, anything else = block
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(undefined); // undefined = not checked yet
  const loc = useLocation();

  // FIRST: Wait for Firebase auth to initialize
  useEffect(() => {
    console.debug('[AdminRoute] 🔒 Mounting guard for path:', loc.pathname);
    
    const unsub = onAuthStateChanged(auth, (user) => {
      console.debug('[AdminRoute] 🔑 Firebase auth state:', user ? `User: ${user.email}` : 'No user (logged out)');
      setFirebaseUser(user);
    });
    
    return () => unsub();
  }, [loc.pathname]);

  // SECOND: Once Firebase state is known, verify with backend
  useEffect(() => {
    // Don't check backend until we know Firebase state
    if (firebaseUser === undefined) {
      console.debug('[AdminRoute] ⏳ Waiting for Firebase auth to initialize...');
      return;
    }

    // If no Firebase user, immediately set as visitor (no need to check backend)
    if (!firebaseUser) {
      console.warn('[AdminRoute] ❌ No Firebase user detected, blocking access');
      setRole('visitor');
      setLoading(false);
      return;
    }

    // Firebase user exists, verify admin status with backend
    console.debug('[AdminRoute] 🔍 Firebase user exists, verifying admin status with backend...');
    
    let mounted = true;
    let triedRefresh = false;

    (async () => {
      
      try {
        const res = await api.get('/me');
        if (!mounted) return;
        
        const returnedRole = res?.data?.role;
        console.debug('[AdminRoute] 📡 Backend response - role:', returnedRole);

        // CRITICAL: Only 'admin' string is allowed
        if (returnedRole === 'admin') {
          console.debug('[AdminRoute] ✅ ADMIN VERIFIED - Access granted');
          setRole('admin');
        } else {
          console.warn('[AdminRoute] ❌ NOT ADMIN - Backend returned role:', returnedRole);
          setRole('visitor');
        }
      } catch (err) {
        console.warn('[AdminRoute] ⚠️ Backend /me request failed:', err?.response?.status, err?.message);
        
        // Try refreshing token if user is logged in
        if (firebaseUser && firebaseUser.getIdToken && !triedRefresh) {
          triedRefresh = true;
          try {
            console.debug('[AdminRoute] 🔄 Refreshing Firebase token...');
            await firebaseUser.getIdToken(true);
            
            const retry = await api.get('/me');
            if (!mounted) return;

            const retryRole = retry?.data?.role;
            console.debug('[AdminRoute] 📡 Backend retry response - role:', retryRole);
            
            if (retryRole === 'admin') {
              console.debug('[AdminRoute] ✅ ADMIN VERIFIED (after retry) - Access granted');
              setRole('admin');
            } else {
              console.warn('[AdminRoute] ❌ NOT ADMIN (after retry) - role:', retryRole);
              setRole('visitor');
            }
            if (mounted) setLoading(false);
            return;
          } catch (retryErr) {
            console.warn('[AdminRoute] ⚠️ Retry also failed:', retryErr?.response?.status, retryErr?.message);
          }
        }
        
        // All failures result in visitor role (block access)
        if (!mounted) return;
        console.warn('[AdminRoute] ❌ Setting visitor role - blocking access');
        setRole('visitor');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    
    return () => { mounted = false; };
  }, [firebaseUser]);

  if (loading) {
    console.debug('[AdminRoute] Still loading, showing skeleton');
    return <LoadingSkeleton rows={3} cols={4} />;
  }

  // CRITICAL: Only allow access if explicitly verified as admin
  if (role !== 'admin') {
    console.warn('[AdminRoute] ❌ BLOCKING ACCESS - role is "' + role + '" (not "admin"), redirecting to /admin/access');
    return <Navigate to="/admin/access" state={{ from: loc }} replace />;
  }

  // Only reached if role === 'admin'
  console.debug('[AdminRoute] ✅ Access granted - rendering admin content');
  return children;
}
