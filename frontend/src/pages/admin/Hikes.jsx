import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './admin.css';
import { listHikes, deleteHike, getHikeParticipants, deleteBooking } from './services/adminApi';
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

  // participants modal
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [selectedHike, setSelectedHike] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // remove participant confirmation
  const [removeParticipantConfirmOpen, setRemoveParticipantConfirmOpen] = useState(false);
  const [removeParticipantTarget, setRemoveParticipantTarget] = useState(null);

  const handleViewParticipants = async (hike) => {
    setSelectedHike(hike);
    setParticipantsModalOpen(true);
    setLoadingParticipants(true);
    try {
      const res = await getHikeParticipants(hike.id);
      setParticipants(res.participants || []);
    } catch (err) {
      console.warn('Failed to load participants', err);
      showToast('Failed to load participants', 'error');
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleRemoveParticipant = async (bookingId) => {
    setRemoveParticipantTarget(bookingId);
    setRemoveParticipantConfirmOpen(true);
  };

  const doRemoveParticipant = async () => {
    if (!removeParticipantTarget) return;
    
    try {
      await deleteBooking(removeParticipantTarget);
      showToast('Participant removed', 'success');
      // Reload participants
      const res = await getHikeParticipants(selectedHike.id);
      setParticipants(res.participants || []);
      // Reload hikes list to update participant count
      const hikesRes = await listHikes({ page, pageSize, q: query });
      setHikes(Array.isArray(hikesRes.items) ? hikesRes.items : []);
      setTotal(hikesRes.total || 0);
    } catch (err) {
      console.warn('Failed to remove participant', err);
      showToast('Failed to remove participant', 'error');
    } finally {
      setRemoveParticipantConfirmOpen(false);
      setRemoveParticipantTarget(null);
    }
  };

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
    { key: 'status', title: 'Status', render: (r) => {
      const status = r.status || 'ACTIVE';
      const statusColor = status === 'DELETED' ? '#f44336' : '#4caf50';
      return <span style={{ padding: '2px 6px', borderRadius: 3, background: statusColor, color: '#fff', fontSize: '0.85em' }}>{status}</span>;
    }},
    { 
      key: 'participantsCount', 
      title: 'Participants', 
      render: (r) => (
        <button 
          onClick={() => handleViewParticipants(r)} 
          style={{ 
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#1e40af',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#dbeafe';
            e.target.style.borderColor = '#93c5fd';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#eff6ff';
            e.target.style.borderColor = '#bfdbfe';
          }}
        >
          {r.participantsCount || 0}
        </button>
      )
    },
    { key: 'actions', title: 'Actions', render: (r) => {
      const isDeleted = r.status === 'DELETED';
      return (
        <div className="admin-actions" style={{ display: 'flex', gap: 6 }}>
          <Link to={`/admin/hikes/${r.id}`} className="btn" style={{ textDecoration: 'none', opacity: isDeleted ? 0.5 : 1, pointerEvents: isDeleted ? 'none' : 'auto' }}>Edit</Link>
          <button className="btn btn-outline-danger" onClick={() => handleDelete(r)} disabled={isDeleted} style={{ opacity: isDeleted ? 0.5 : 1 }}>{isDeleted ? 'Deleted' : 'Delete'}</button>
        </div>
      );
    }},
  ];

  return (
    <div className="admin-hikes">
      <h2>Hikes Management</h2>
      
      <div className="admin-filter-bar">
        <input className="admin-search-bar" placeholder="Search hikes" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        <div className="admin-results-count">Showing {filtered.length} results</div>
      </div>

      <DataTable columns={columns} data={pageItems} />

      <div className="pagination">
        <div className="pagination-info">Page {page} of {pages} — {total} total</div>
        <div className="pagination-controls">
          <button onClick={async () => { const p = Math.max(1, page-1); setPage(p); const res = await listHikes({ page: p, pageSize, q: query }); setHikes(Array.isArray(res.items) ? res.items : []); setTotal(res.total || 0); }} disabled={page===1}>Previous</button>
          <button onClick={async () => { const p = Math.min(pages, page+1); setPage(p); const res = await listHikes({ page: p, pageSize, q: query }); setHikes(Array.isArray(res.items) ? res.items : []); setTotal(res.total || 0); }} disabled={page===pages}>Next</button>
        </div>
      </div>

      <ConfirmDialog open={deleteConfirmOpen} title="Delete Hike?" message={`Are you sure you want to permanently DELETE the hike "${deleteTarget?.name || ''}"? This will also remove all bookings and reviews. Type DELETE to confirm.`} onConfirm={doDelete} onCancel={() => setDeleteConfirmOpen(false)} requireTyping={true} />

      {/* Participants Modal */}
      {participantsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            maxWidth: 600,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Participants for "{selectedHike?.name}"</h3>
              <button onClick={() => setParticipantsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            {loadingParticipants ? (
              <div style={{ padding: 20, textAlign: 'center' }}>Loading participants...</div>
            ) : participants.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No participants yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                    <th style={{ padding: 12, textAlign: 'left' }}>Email</th>
                    <th style={{ padding: 12, textAlign: 'right', width: 100 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={p.bookingId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 12 }}>{p.name}</td>
                      <td style={{ padding: 12 }}>{p.email}</td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button 
                          className="btn-danger" 
                          onClick={() => handleRemoveParticipant(p.bookingId)}
                          style={{ 
                            padding: '4px 12px', 
                            fontSize: '13px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={removeParticipantConfirmOpen}
        title="Remove Participant"
        message="Are you sure you want to remove this participant from the hike? This action cannot be undone."
        onConfirm={doRemoveParticipant}
        onCancel={() => {
          setRemoveParticipantConfirmOpen(false);
          setRemoveParticipantTarget(null);
        }}
      />
    </div>
  );
}
