import React, { useEffect, useState } from 'react';
import { listUsers, patchUser, deleteUser, deleteGuide } from './services/adminApi';
import api from '../../api';
import './admin.css';
import DataTable from './components/DataTable';
import LoadingSkeleton from './components/LoadingSkeleton';
import EmptyState from './components/EmptyState';
import ConfirmDialog from './components/ConfirmDialog';

function showToast(message, type = 'info') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (e) {}
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch current user info
        const meRes = await api.get('/me');
        if (mounted) setCurrentUser(meRes.data);
        
        const res = await listUsers({ page: 1, pageSize });
        if (mounted) {
          setUsers(Array.isArray(res.items) ? res.items : []);
          setTotal(res.total || 0);
        }
      } catch (err) {
        console.warn('Failed to load users', err.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Search + pagination (server-side)
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [total, setTotal] = useState(0);
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const pageItems = users;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [roleLoading, setRoleLoading] = useState(null); // user id being updated

  // delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = (user) => {
    setDeleteTarget(user);
    setDeleteConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.role === 'guide' && deleteTarget.guide?.id) {
        // If user is a guide, delete the guide profile using guide ID
        await deleteGuide(deleteTarget.guide.id);
      } else {
        // For regular users or hikers, delete the user
        await deleteUser(deleteTarget.id);
      }
      showToast('User deleted', 'success');
      const res = await listUsers({ page, pageSize, q: query });
      setUsers(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to delete user', err);
      showToast('Failed to delete user', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleChangeRole = (user, role) => {
    setActiveUser({ ...user, newRole: role });
    setConfirmOpen(true);
  };

  const doChangeRole = async () => {
    if (!activeUser) return;
    setRoleLoading(activeUser.id);
    try {
      await patchUser(activeUser.id, { role: activeUser.newRole });
      showToast('User role updated', 'success');
      
      // Update the user in the current list immediately
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === activeUser.id ? { ...u, role: activeUser.newRole } : u
      ));
      
      // Refetch to ensure sync
      const res = await listUsers({ page, pageSize, q: query });
      setUsers(Array.isArray(res.items) ? res.items : []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to update role', err);
      showToast('Failed to update role', 'error');
    } finally {
      setRoleLoading(null);
      setConfirmOpen(false);
      setActiveUser(null);
    }
  };

  if (loading) return <LoadingSkeleton rows={6} cols={5} />;

  if (!users || users.length === 0) return <EmptyState title="No users found" description="There are no users in the system." />;

  const columns = [
    { key: 'name', title: 'Name', render: (r) => (r.name || '—') },
    { key: 'email', title: 'Email' },
    { key: 'role', title: 'Role', render: (r) => {
      const role = r.role || 'user';
      
      // Only show the current role badge
      return (
        <span style={{ padding: '2px 6px', borderRadius: 3, background: '#ddd', fontSize: '0.85em' }}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
      );
    }},
    { key: 'status', title: 'Status', render: (r) => {
      const statusColor = r.status === 'DELETED' ? '#f44336' : r.status === 'ACTIVE' ? '#4caf50' : '#ff9800';
      return <span style={{ padding: '2px 6px', borderRadius: 3, background: statusColor, color: '#fff', fontSize: '0.85em' }}>{r.status || 'ACTIVE'}</span>;
    }},
    { key: 'createdAt', title: 'Joined', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
    { key: 'actions', title: 'Actions', render: (r) => {
      const isUserAdmin = r.role === 'admin';
      
      // Build available roles based on current role and business rules
      let availableRoles = [];
      
      if (isUserAdmin) {
        // Admin can only remain admin
        availableRoles = ['admin'];
      } else if (r.role === 'guide') {
        // Guides cannot be demoted to hiker, only remain guide
        availableRoles = ['guide'];
      } else if (r.role === 'hiker') {
        // Hikers can be promoted to guide
        availableRoles = ['hiker', 'guide'];
      } else {
        // Default user role
        availableRoles = ['user', 'hiker', 'guide'];
      }
      
      const shouldDisableDropdown = roleLoading === r.id || r.status === 'DELETED' || isUserAdmin;
      
      return (
        <div className="admin-actions">
          <select 
            value={r.role || 'user'} 
            onChange={(e) => handleChangeRole(r, e.target.value)} 
            disabled={shouldDisableDropdown}
            className={`role-select ${shouldDisableDropdown ? 'disabled' : ''}`}
          >
            {availableRoles.map(role => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
          <button className="btn btn-outline-danger" onClick={() => handleDelete(r)} disabled={r.status === 'DELETED'}>
            {r.status === 'DELETED' ? 'Deleted' : 'Delete'}
          </button>
        </div>
      );
    }},
  ];

  return (
    <div className="admin-users">
      <h2>Users Management</h2>
      
      <div className="admin-filter-bar">
        <input className="admin-search-bar" placeholder="Search users" value={query} onChange={async (e) => { const q = e.target.value; setQuery(q); setPage(1); const res = await listUsers({ page: 1, pageSize, q }); setUsers(Array.isArray(res.items) ? res.items : []); setTotal(res.total || 0); }} />
        <div className="admin-results-count">Showing {total} results</div>
      </div>

      <DataTable columns={columns} data={pageItems} />

      <div className="pagination">
        <div className="pagination-info">Page {page} of {pages}</div>
        <div className="pagination-controls">
          <button onClick={async () => { const p = Math.max(1, page-1); setPage(p); const res = await listUsers({ page: p, pageSize, q: query }); setUsers(Array.isArray(res.items) ? res.items : []); setTotal(res.total || 0); }} disabled={page===1}>Previous</button>
          <button onClick={async () => { const p = Math.min(pages, page+1); setPage(p); const res = await listUsers({ page: p, pageSize, q: query }); setUsers(Array.isArray(res.items) ? res.items : []); setTotal(res.total || 0); }} disabled={page===pages}>Next</button>
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} title="Confirm action" message={`Are you sure you want to change role / suspend "${activeUser?.name || ''}"?`} onConfirm={doChangeRole} onCancel={() => setConfirmOpen(false)} />

      <ConfirmDialog open={deleteConfirmOpen} title="Delete User?" message={`This will SOFT DELETE the user "${deleteTarget?.name || ''}" by setting status to DELETED and anonymizing their email/name. The user will not be able to sign in. Type DELETE to confirm.`} onConfirm={doDelete} onCancel={() => setDeleteConfirmOpen(false)} requireTyping={true} />
    </div>
  );
}
