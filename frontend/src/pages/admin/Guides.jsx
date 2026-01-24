import React, { useEffect, useState } from 'react';
import { listGuides, patchGuide, deleteGuide } from './services/adminApi';
import './admin.css';
import DataTable from './components/DataTable';
import LoadingSkeleton from './components/LoadingSkeleton';
import EmptyState from './components/EmptyState';
import ConfirmDialog from './components/ConfirmDialog';

function showToast(message, type = 'info') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (e) {}
}

export default function Guides() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [total, setTotal] = useState(0);
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listGuides({ page, pageSize });
        if (mounted) {
          setGuides(Array.isArray(res.items) ? res.items : []);
          setTotal(res.total || 0);
        }
      } catch (err) {
        console.warn('Failed to load guides', err.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Toggle verified status
  const [verifyLoading, setVerifyLoading] = useState(null);
  const [verifyConfirmOpen, setVerifyConfirmOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);

  const handleToggleVerified = (guide) => {
    setVerifyTarget(guide);
    setVerifyConfirmOpen(true);
  };

  const doToggleVerified = async () => {
    if (!verifyTarget) return;
    setVerifyLoading(verifyTarget.id);
    try {
      const newVal = !verifyTarget.isVerified;
      await patchGuide(verifyTarget.id, { isVerified: newVal });
      showToast(`Guide ${newVal ? 'verified' : 'unverified'}`, 'success');
      const res = await listGuides({ page, pageSize, q: query });
      setGuides(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total || 0);
    } catch (err) {
      showToast('Failed to update guide', 'error');
    } finally {
      setVerifyLoading(null);
      setVerifyConfirmOpen(false);
      setVerifyTarget(null);
    }
  };

  // Toggle featured status
  const [featureLoading, setFeatureLoading] = useState(null);
  const [featureConfirmOpen, setFeatureConfirmOpen] = useState(false);
  const [featureTarget, setFeatureTarget] = useState(null);

  const handleToggleFeatured = (guide) => {
    setFeatureTarget(guide);
    setFeatureConfirmOpen(true);
  };

  const doToggleFeatured = async () => {
    if (!featureTarget) return;
    setFeatureLoading(featureTarget.id);
    try {
      const newVal = !featureTarget.isFeatured;
      await patchGuide(featureTarget.id, { isFeatured: newVal });
      showToast(`Guide ${newVal ? 'featured' : 'unfeatured'}`, 'success');
      const res = await listGuides({ page, pageSize, q: query });
      setGuides(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total || 0);
    } catch (err) {
      showToast('Failed to update guide', 'error');
    } finally {
      setFeatureLoading(null);
      setFeatureConfirmOpen(false);
      setFeatureTarget(null);
    }
  };

  // Delete guide
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = (guide) => {
    setDeleteTarget(guide);
    setDeleteConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGuide(deleteTarget.id);
      showToast('Guide deleted', 'success');
      const res = await listGuides({ page, pageSize, q: query });
      setGuides(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total || 0);
    } catch (err) {
      showToast('Failed to delete guide', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingSkeleton rows={6} cols={6} />;

  if (!guides || guides.length === 0) return <EmptyState title="No guides found" description="There are no guides in the system." />;

  const columns = [
    { key: 'displayName', title: 'Display Name', render: (r) => r.displayName || r.user?.name || '—' },
    { key: 'email', title: 'Email', render: (r) => r.user?.email || '—' },
    { key: 'status', title: 'Status', render: (r) => {
      const status = r.status || r.user?.status || 'ACTIVE';
      const statusColor = status === 'DELETED' ? '#f44336' : status === 'ACTIVE' ? '#4caf50' : '#ff9800';
      return <span style={{ padding: '2px 6px', borderRadius: 3, background: statusColor, color: '#fff', fontSize: '0.85em' }}>{status}</span>;
    }},
    { key: 'createdAt', title: 'Joined', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : r.user?.createdAt ? new Date(r.user.createdAt).toLocaleDateString() : '—') },
    { key: 'stats', title: 'Stats', render: (r) => `${r._count?.hikes || 0} hikes, ${r._count?.reviews || 0} reviews` },
    { key: 'actions', title: 'Actions', render: (r) => {
      const isDeleted = r.status === 'DELETED' || r.user?.status === 'DELETED';
      return (
        <div className="admin-actions" style={{ display: 'flex', gap: 6 }}>
          <button 
            className="btn btn-outline-danger btn-sm" 
            onClick={() => handleDelete(r)}
            disabled={isDeleted}
            style={{ opacity: isDeleted ? 0.5 : 1, cursor: isDeleted ? 'not-allowed' : 'pointer' }}
          >
            {isDeleted ? 'Deleted' : 'Delete'}
          </button>
        </div>
      );
    }},
  ];

  return (
    <div className="admin-guides">
      <h2>Guides Management</h2>
      
      <div className="admin-filter-bar">
        <input 
          className="admin-search-bar"
          placeholder="Search guides" 
          value={query} 
          onChange={async (e) => { 
            const q = e.target.value; 
            setQuery(q); 
            setPage(1); 
            const res = await listGuides({ page: 1, pageSize, q }); 
            setGuides(Array.isArray(res.items) ? res.items : []); 
            setTotal(res.total || 0); 
          }} 
        />
        <div className="admin-results-count">Showing {total} results</div>
      </div>

      <DataTable columns={columns} data={guides} />

      <div className="pagination">
        <div className="pagination-info">Page {page} of {pages}</div>
        <div className="pagination-controls">
          <button 
            onClick={async () => { 
              const p = Math.max(1, page-1); 
              setPage(p); 
              const res = await listGuides({ page: p, pageSize, q: query }); 
              setGuides(Array.isArray(res.items) ? res.items : []); 
              setTotal(res.total || 0); 
            }} 
            disabled={page===1}
          >
            Previous
          </button>
          <button 
            onClick={async () => { 
              const p = Math.min(pages, page+1); 
              setPage(p); 
              const res = await listGuides({ page: p, pageSize, q: query }); 
              setGuides(Array.isArray(res.items) ? res.items : []); 
              setTotal(res.total || 0); 
            }} 
            disabled={page===pages}
          >
            Next
          </button>
        </div>
      </div>

      <ConfirmDialog 
        open={verifyConfirmOpen} 
        title={`${verifyTarget?.isVerified ? 'Unverify' : 'Verify'} Guide?`}
        message={`Are you sure you want to ${verifyTarget?.isVerified ? 'unverify' : 'verify'} "${verifyTarget?.displayName || verifyTarget?.user?.name || ''}"?`}
        onConfirm={doToggleVerified} 
        onCancel={() => setVerifyConfirmOpen(false)} 
      />

      <ConfirmDialog 
        open={featureConfirmOpen} 
        title={`${featureTarget?.isFeatured ? 'Unfeature' : 'Feature'} Guide?`}
        message={`Are you sure you want to ${featureTarget?.isFeatured ? 'unfeature' : 'feature'} "${featureTarget?.displayName || featureTarget?.user?.name || ''}"?`}
        onConfirm={doToggleFeatured} 
        onCancel={() => setFeatureConfirmOpen(false)} 
      />

      <ConfirmDialog 
        open={deleteConfirmOpen} 
        title="Delete Guide?" 
        message={`Are you sure you want to DELETE guide "${deleteTarget?.displayName || deleteTarget?.user?.name || ''}"? This will also delete all their hikes. Type DELETE to confirm.`}
        onConfirm={doDelete} 
        onCancel={() => setDeleteConfirmOpen(false)} 
        requireTyping={true}
      />
    </div>
  );
}
