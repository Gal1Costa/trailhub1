import React, { useEffect, useState } from 'react';
import api from '../../api';
import { auth, reauthenticateWithCredential, EmailAuthProvider, onAuthStateChanged } from '../../firebase';
import DashboardCard from './components/DashboardCard';
import Hikes from './Hikes';
import Users from './Users';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [tab, setTab] = useState('Overview');
  // simplified: remove reauth confirmation flow; load dashboard when overview available

  useEffect(() => {
    let mounted = true;
      (async () => {
      try {
        const res = await api.get('/admin/overview');
        if (mounted) setOverview(res.data);
        if (mounted) setUnauthorized(false);
      } catch (err) {
        // If not authorized, show login prompt
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          if (mounted) setUnauthorized(true);
        }
        console.warn('Failed to load admin overview', err.message || err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Run a lightweight admin check — used after sign-in
  const checkAdmin = async () => {
    try {
      const res = await api.get('/admin/overview');
      setOverview(res.data);
      setUnauthorized(false);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setUnauthorized(true);
      } else {
        console.warn('Failed to verify admin access', err.message || err);
      }
    }
  };

  // note: reauth removed — we rely on server-side check performed in useEffect and onAuthStateChanged

  // Re-run check when header dispatches admin:signedin event (after role fetch)
  useEffect(() => {
    const onAdminSignedIn = () => {
      // attempt to verify and show dashboard
      checkAdmin();
    };
    window.addEventListener('admin:signedin', onAdminSignedIn);
    return () => window.removeEventListener('admin:signedin', onAdminSignedIn);
  }, []);

  // Re-fetch when auth state changes (user signs in/out)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      // attempt to re-load overview after auth change
      (async () => {
      try {
        const res = await api.get('/admin/overview');
        setOverview(res.data);
        setUnauthorized(false);
      } catch (err) {
          const status = err?.response?.status;
          if (status === 401 || status === 403) setUnauthorized(true);
        }
      })();
    });
    return () => unsub();
  }, []);

  function openAuthModal() {
    try {
      window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
    } catch (e) {
      console.warn('Unable to open auth modal programmatically', e);
    }
  }

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>

      {unauthorized ? (
        <div className="placeholder">
          <p>To view the admin dashboard please sign in with an admin account.</p>
          <div style={{ marginTop: 8 }}>
            <button onClick={openAuthModal} style={{ padding: '6px 10px', marginRight: 8 }}>Sign in</button>
            <button onClick={() => { window.history.back(); }} style={{ padding: '6px 10px' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="admin-cards">
            <DashboardCard title="Total Users" value={overview?.users ?? '—'} to="/admin/users" />
            <DashboardCard title="Total Guides" value={overview?.guides ?? overview?.hikes ?? '—'} to="/admin/users" />
            <DashboardCard title="Total Bookings" value={overview?.bookings ?? '—'} to="/admin/hikes" />
            <DashboardCard title="Average Rating" value={overview?.averageRating ? Number(overview.averageRating).toFixed(2) : '—'} />
          </div>


          {/* tabs are provided by AdminLayout/AdminTabs - do not duplicate here */}

          <div className="admin-section">
            {tab === 'Overview' && <div className="placeholder">Overview placeholder — coming soon.</div>}
            {tab === 'Analytics' && <div className="placeholder">Analytics placeholder — coming soon.</div>}
            {tab === 'Hikes' && <Hikes />}
            {tab === 'Users' && <Users />}
            {tab === 'Moderation' && <div className="placeholder">Moderation placeholder — coming soon.</div>}
          </div>
        </>
      )}
    </div>
  );
}
