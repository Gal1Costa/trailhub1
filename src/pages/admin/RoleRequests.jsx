import React, { useEffect, useState } from 'react';
import { getRoleRequests, approveRoleRequest, rejectRoleRequest } from './services/adminApi';
import './RoleRequests.css';

export default function RoleRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, requestId: null, userName: '' });

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      const data = await getRoleRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load role requests:', err);
    } finally {
      setLoading(false);
    }
  }

  function openConfirmDialog(type, requestId, userName) {
    setConfirmDialog({ open: true, type, requestId, userName });
  }

  function closeConfirmDialog() {
    setConfirmDialog({ open: false, type: null, requestId: null, userName: '' });
  }

  async function handleConfirm() {
    const { type, requestId } = confirmDialog;
    
    try {
      if (type === 'approve') {
        await approveRoleRequest(requestId);
        window.dispatchEvent(new CustomEvent('app:toast', { 
          detail: { 
            message: '✓ Request approved successfully! User is now a guide.', 
            type: 'success' 
          } 
        }));
      } else if (type === 'reject') {
        await rejectRoleRequest(requestId);
        window.dispatchEvent(new CustomEvent('app:toast', { 
          detail: { 
            message: 'Request rejected', 
            type: 'info' 
          } 
        }));
      }
      closeConfirmDialog();
      loadRequests();
    } catch (err) {
      console.error(`Failed to ${type} request:`, err);
      window.dispatchEvent(new CustomEvent('app:toast', { 
        detail: { 
          message: `Failed to ${type} request`, 
          type: 'error' 
        } 
      }));
    }
  }

  async function handleApprove(requestId, userName) {
    openConfirmDialog('approve', requestId, userName);
  }

  async function handleReject(requestId, userName) {
    openConfirmDialog('reject', requestId, userName);
  }

  if (loading) {
    return <div className="admin-page"><p>Loading role requests...</p></div>;
  }

  return (
    <div className="admin-role-requests">
      <div className="page-header">
        <h1>🚀 Guide Role Requests</h1>
        <p className="page-subtitle">
          Review and manage requests from hikers wanting to become guides
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <p>No pending role requests</p>
        </div>
      ) : (
        <div className="requests-grid">
          {requests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <div className="user-info">
                  <div className="user-avatar">
                    {request.user?.name?.[0] || request.user?.email?.[0] || 'U'}
                  </div>
                  <div className="user-details">
                    <h3>{request.user?.name || 'Unknown User'}</h3>
                    <p className="user-email">{request.user?.email}</p>
                  </div>
                </div>
                <div className="request-badge">
                  ⏳ Pending
                </div>
              </div>

              <div className="request-info">
                <div className="info-row">
                  <span className="info-label">Current Role:</span>
                  <span className="role-badge hiker">Hiker</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Requested Role:</span>
                  <span className="role-badge guide">Guide</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Request Date:</span>
                  <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                </div>
                {request.user?.hikerProfile?.bio && (
                  <div className="info-row">
                    <span className="info-label">Bio:</span>
                    <span className="bio-text">{request.user.hikerProfile.bio}</span>
                  </div>
                )}
              </div>

              <div className="request-actions">
                <button 
                  onClick={() => handleApprove(request.id, request.user?.name || request.user?.email)}
                  className="btn-approve"
                >
                  ✓ Approve
                </button>
                <button 
                  onClick={() => handleReject(request.id, request.user?.name || request.user?.email)}
                  className="btn-reject"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <div className="confirm-overlay" onClick={closeConfirmDialog}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              {confirmDialog.type === 'approve' ? (
                <>
                  <div className="confirm-icon approve">✓</div>
                  <h3>Approve Guide Request</h3>
                </>
              ) : (
                <>
                  <div className="confirm-icon reject">✗</div>
                  <h3>Reject Guide Request</h3>
                </>
              )}
            </div>
            
            <div className="confirm-body">
              {confirmDialog.type === 'approve' ? (
                <>
                  <p className="confirm-message">
                    Are you sure you want to approve this request and make <strong>{confirmDialog.userName}</strong> a guide?
                  </p>
                  <p className="confirm-detail">
                    This will change their role from Hiker to Guide and allow them to create and manage hikes.
                  </p>
                </>
              ) : (
                <>
                  <p className="confirm-message">
                    Are you sure you want to reject <strong>{confirmDialog.userName}</strong>'s guide request?
                  </p>
                  <p className="confirm-detail">
                    They will be notified that their request was not approved.
                  </p>
                </>
              )}
            </div>
            
            <div className="confirm-actions">
              <button 
                onClick={closeConfirmDialog}
                className="btn-confirm-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                className={`btn-confirm ${confirmDialog.type === 'approve' ? 'approve' : 'reject'}`}
              >
                {confirmDialog.type === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
