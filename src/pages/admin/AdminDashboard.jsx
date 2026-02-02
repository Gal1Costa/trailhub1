import React, { useEffect, useState } from 'react';
import api from '../../api';
import { auth, reauthenticateWithCredential, EmailAuthProvider, onAuthStateChanged } from '../../firebase';
import DashboardCard from './components/DashboardCard';
import Hikes from './Hikes';
import Users from './Users';
import { getRoleRequests } from './services/adminApi';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [pendingRequests, setPendingRequests] = useState(0);
  // simplified: remove reauth confirmation flow; load dashboard when overview available

  useEffect(() => {
    let mounted = true;
      (async () => {
      try {
        const res = await api.get('/admin/overview');
        if (mounted) setOverview(res.data);
        if (mounted) setUnauthorized(false);

        // Load pending role requests count
        try {
          const requests = await getRoleRequests();
          if (mounted) setPendingRequests(requests.length);
        } catch (err) {
          console.warn('Failed to load role requests count', err);
        }
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
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back! Here's an overview of your platform.</p>
        </div>
      </div>

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
            <DashboardCard title="Total Guides" value={overview?.guides ?? overview?.hikes ?? '—'} to="/admin/guides" />
            <DashboardCard title="Total Bookings" value={overview?.bookings ?? '—'} to="/admin/hikes" />
            {pendingRequests > 0 && (
              <DashboardCard 
                title="Role Requests" 
                value={`${pendingRequests} 🚀`} 
                to="/admin/role-requests"
                highlight={true}
              />
            )}
          </div>


          {/* tabs are provided by AdminLayout/AdminTabs - do not duplicate here */}

          <div className="admin-section">
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
