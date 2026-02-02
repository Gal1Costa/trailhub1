import React, { useEffect, useState } from 'react';
import { listUsers, listGuides } from './services/adminApi';
import './admin.css';
import DataTable from './components/DataTable';
import LoadingSkeleton from './components/LoadingSkeleton';
import EmptyState from './components/EmptyState';

function showToast(message, type = 'info') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (e) {}
}

export default function DeletedAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'users', 'guides'

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [total, setTotal] = useState(0);
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));

  useEffect(() => {
    loadDeletedAccounts();
  }, [activeTab, page]);

  const loadDeletedAccounts = async () => {
    setLoading(true);
    try {
      let allDeleted = [];

      if (activeTab === 'all' || activeTab === 'users') {
        const usersRes = await listUsers({ page, pageSize, q: query });
        // Filter out users who are guides - they'll be shown in the guides section
        const deletedUsers = (usersRes.items || [])
          .filter(u => u.status === 'DELETED' && !u.guide)
          .map(u => ({
            ...u,
            type: 'User',
            displayName: u.name,
            email: u.email,
          }));
        allDeleted = [...allDeleted, ...deletedUsers];
      }

      if (activeTab === 'all' || activeTab === 'guides') {
        const guidesRes = await listGuides({ page, pageSize, q: query });
        const deletedGuides = (guidesRes.items || []).filter(g => g.status === 'DELETED' || g.user?.status === 'DELETED').map(g => ({
          ...g,
          type: 'Guide',
          displayName: g.displayName || g.user?.name,
          email: g.user?.email,
        }));
        allDeleted = [...allDeleted, ...deletedGuides];
      }

      // Sort chronologically by deletion date (or creation date if deletedAt not available)
      allDeleted.sort((a, b) => {
        const dateA = new Date(a.deletedAt || a.user?.deletedAt || a.createdAt || 0);
        const dateB = new Date(b.deletedAt || b.user?.deletedAt || b.createdAt || 0);
        return dateB - dateA; // Most recent first
      });

      setAccounts(allDeleted);
      setTotal(allDeleted.length);
    } catch (err) {
      console.warn('Failed to load deleted accounts', err.message || err);
      showToast('Failed to load deleted accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery);
    setPage(1);
    await loadDeletedAccounts();
  };

  if (loading) return <LoadingSkeleton rows={6} cols={5} />;

  const columns = [
    { key: 'type', title: 'Type', render: (r) => (
      <span style={{ padding: '2px 6px', borderRadius: 3, background: r.type === 'Guide' ? '#4caf50' : '#2196f3', color: '#fff', fontSize: '0.85em' }}>
        {r.type}
      </span>
    )},
    { key: 'displayName', title: 'Name', render: (r) => r.displayName || '—' },
    { key: 'email', title: 'Email', render: (r) => r.email || '—' },
    { key: 'status', title: 'Status', render: (r) => (
      <span style={{ padding: '2px 6px', borderRadius: 3, background: '#f44336', color: '#fff', fontSize: '0.85em' }}>
        DELETED
      </span>
    )},
    { key: 'createdAt', title: 'Joined', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : r.user?.createdAt ? new Date(r.user.createdAt).toLocaleDateString() : '—') },
  ];

  return (
    <div className="admin-deleted-accounts">
      <h2>Deleted Accounts</h2>
      
      <div className="tab-filters" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button 
          className={`btn ${activeTab === 'all' ? 'btn-primary' : ''}`}
          onClick={() => { setActiveTab('all'); setPage(1); }}
        >
          All
        </button>
        <button 
          className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`}
          onClick={() => { setActiveTab('users'); setPage(1); }}
        >
          Users
        </button>
        <button 
          className={`btn ${activeTab === 'guides' ? 'btn-primary' : ''}`}
          onClick={() => { setActiveTab('guides'); setPage(1); }}
        >
          Guides
        </button>
      </div>

      <div className="admin-filter-bar">
        <input 
          className="admin-search-bar"
          placeholder="Search deleted accounts" 
          value={query} 
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className="admin-results-count">Showing {total} results</div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="No deleted accounts found" description="There are no deleted accounts in the system." />
      ) : (
        <>
          <DataTable columns={columns} data={accounts} />

          <div className="pagination">
            <div className="pagination-info">Page {page} of {pages}</div>
            <div className="pagination-controls">
              <button onClick={() => setPage(Math.max(1, page-1))} disabled={page===1}>Previous</button>
              <button onClick={() => { const p = Math.min(pages, page+1); setPage(p); }} disabled={page===pages}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
