import React from 'react';
import { Link } from 'react-router-dom';
import './AdminTabs.css';

const tabs = [
  { key: 'overview', label: 'Overview', to: '/admin' },
  { key: 'hikes', label: 'Hikes', to: '/admin/hikes' },
  { key: 'users', label: 'Users', to: '/admin/users' },
  { key: 'guides', label: 'Guides', to: '/admin/guides' },
  { key: 'analytics', label: 'Analytics', to: '/admin/analytics' },
  { key: 'moderation', label: 'Moderation', to: '/admin/moderation' },
];

export default function AdminTabs({ currentPath = '' }) {
  return (
    <nav className="admin-tabs" aria-label="Admin sections">
      {tabs.map(t => (
        <Link
          key={t.key}
          to={t.to}
          className={currentPath.startsWith(t.to) ? 'active' : ''}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
