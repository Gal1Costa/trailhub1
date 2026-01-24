import React from 'react';
import { Link } from 'react-router-dom';
import './AdminTabs.css';

const tabs = [
  { key: 'overview', label: 'Overview', to: '/admin' },
  { key: 'hikes', label: 'Hikes', to: '/admin/hikes' },
  { key: 'users', label: 'Users', to: '/admin/users' },
  { key: 'guides', label: 'Guides', to: '/admin/guides' },
  { key: 'requests', label: 'Role Requests', to: '/admin/role-requests' },
  { key: 'deleted', label: 'Deleted', to: '/admin/deleted' },
  { key: 'analytics', label: 'Analytics', to: '/admin/analytics' },
];

export default function AdminTabs({ currentPath = '' }) {
  const isActive = (tabPath) => {
    // Exact match for '/admin' (overview/dashboard)
    if (tabPath === '/admin') {
      return currentPath === '/admin' || currentPath === '/admin/dashboard';
    }
    // For other tabs, check if current path starts with the tab path
    return currentPath.startsWith(tabPath);
  };

  return (
    <nav className="admin-tabs" aria-label="Admin sections">
      {tabs.map(t => (
        <Link
          key={t.key}
          to={t.to}
          className={isActive(t.to) ? 'active' : ''}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
