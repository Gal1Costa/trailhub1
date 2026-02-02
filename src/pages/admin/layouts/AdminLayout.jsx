import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AdminTabs from '../components/AdminTabs';
import './AdminLayout.css';
import { auth } from '../../../firebase';

export default function AdminLayout() {
  const loc = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      try {
        await auth.signOut();
      } catch (e) {
        // ignore sign-out failures
      }
      try {
        window.dispatchEvent(new CustomEvent('admin:signedout'));
      } catch (e) {
        // ignore
      }
      navigate('/explore');
    } catch (e) {
      console.error('Admin logout failed', e);
    }
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <Link to="/admin">
            <div className="brand-title">Admin Dashboard</div>
            <div className="brand-sub">Manage TrailHub platform</div>
          </Link>
        </div>

        <div className="admin-actions">
          <button className="btn btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-topcards">
          <AdminTabs currentPath={loc.pathname} />
        </div>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
