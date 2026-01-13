import React, { useEffect, useState } from 'react';
import './admin.css';
import { listHikes, deleteHike } from './services/adminApi';
import DataTable from './components/DataTable';
import LoadingSkeleton from './components/LoadingSkeleton';
import EmptyState from './components/EmptyState';
import ConfirmDialog from './components/ConfirmDialog';

function showToast(message, type = 'info') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (e) {}
}

export default function Hikes() {
  const [hikes, setHikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await listHikes({ page: 1, pageSize });
        if (mounted) {
          setHikes(Array.isArray(res.items) ? res.items : []);
          setTotal(res.total || 0);
        }
      } catch (err) {
        console.warn('Failed to load hikes', err.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Search + pagination (client-side for now)
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = hikes.filter(h => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (h.name || '').toLowerCase().includes(q) || (h.location || '').toLowerCase().includes(q);
  });

  const [total, setTotal] = useState(0);
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const pageItems = hikes;

  // delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = (hike) => {
    setDeleteTarget(hike);
    setDeleteConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteHike(deleteTarget.id);
      showToast('Hike deleted', 'success');
      // refresh page
      const res = await listHikes({ page, pageSize, q: query });
      setHikes(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total || 0);
    } catch (err) {
      showToast('Failed to delete hike', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingSkeleton rows={6} cols={6} />;

  if (!hikes || hikes.length === 0) return <EmptyState title="No hikes found" description="Try adjusting your filters or check back later." />;

  const columns = [
    { key: 'name', title: 'Title' },
    { key: 'guideName', title: 'Guide' },
    { key: 'date', title: 'Date', render: (r) => (r.date ? new Date(r.date).toLocaleDateString() : '—') },
    { key: 'participantsCount', title: 'Participants' },
    { key: 'distance', title: 'Distance' },
    { key: 'actions', title: 'Actions', render: (r) => (
      <div className="admin-actions">
        <button className="btn btn-outline-danger" onClick={() => handleDelete(r)}>Delete</button>
        <a className="btn" style={{ textDecoration: 'none' }} href={`/hikes/${r.id}`} target="_blank" rel="noreferrer">View</a>
      </div>
    )},
  ];

  return (
    <div className="admin-hikes">
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <input placeholder="Search hikes" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} style={{ padding:8, width:320 }} />
        <div>Showing {filtered.length} results</div>
      </div>

      <DataTable columns={columns} data={pageItems} />

      <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>Page {page} / {pages} — {total} results</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={async () => { const p = Math.max(1, page-1); setPage(p); const res = await listHikes({ page: p, pageSize, q: query }); setHikes(Array.isArray(res.items) ? res.items : []); setTotal(res.total || 0); }} disabled={page===1}>Prev</button>
          <button onClick={async () => { const p = Math.min(pages, page+1); setPage(p); const res = await listHikes({ page: p, pageSize, q: query }); setHikes(Array.isArray(res.items) ? res.items : []); setTotal(res.total || 0); }} disabled={page===pages}>Next</button>
        </div>
      </div>

      <ConfirmDialog open={deleteConfirmOpen} title="Delete Hike?" message={`Are you sure you want to permanently DELETE the hike "${deleteTarget?.name || ''}"? This will also remove all bookings and reviews. Type DELETE to confirm.`} onConfirm={doDelete} onCancel={() => setDeleteConfirmOpen(false)} requireTyping={true} />
    </div>
  );
}
