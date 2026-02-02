import React, { useState, useEffect, useRef } from 'react';
import { auth, updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from '../firebase';
import api from '../api';
import './EditProfileModal.css';

export default function EditProfileModal({ isOpen, onClose, user, onSave, onDelete, deleteInProgress, isPublicView }) {
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    bio: '',
    newPassword: '',
    confirmPassword: '',
    currentPassword: '', // For re-authentication
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // Update form data when user data changes or modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user?.name || '',
        location: user?.hikerProfile?.location || user?.guide?.location || '',
        bio: user?.hikerProfile?.bio || user?.guide?.bio || '',
        newPassword: '',
        confirmPassword: '',
        currentPassword: '',
      });
      setError('');
      setNeedsReauth(false);

      // Check for pending role request if user is a hiker
      if (user?.role === 'hiker') {
        checkRoleRequestStatus();
      }
    }
  }, [isOpen, user]);

  // Focus management and keyboard trapping (same as AuthModal)
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement;

    const getFocusable = () => {
      if (!modalRef.current) return [];
      const focusableSelectors = [
        'button',
        '[href]',
        'input',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(modalRef.current.querySelectorAll(focusableSelectors))
        .filter((el) => !el.disabled && el.offsetParent !== null);
    };

    const focusable = getFocusable();
    if (focusable.length) {
      focusable[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const handleFocusCapture = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        const items = getFocusable();
        if (items.length) {
          items[0].focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focus', handleFocusCapture, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focus', handleFocusCapture, true);

      if (previouslyFocused.current && previouslyFocused.current.focus) {
        previouslyFocused.current.focus();
      }
    };
  }, [isOpen, onClose]);

  async function checkRoleRequestStatus() {
    try {
      const res = await api.get('/me/role-request-status');
      setHasPendingRequest(res?.data?.hasPendingRequest || false);
    } catch (err) {
      console.error('Failed to check role request status:', err);
    }
  }

  async function handleRequestGuideRole() {
    setRequestLoading(true);
    try {
      await api.post('/me/request-guide-role');
      setHasPendingRequest(true);
      
      // Show success toast
      window.dispatchEvent(new CustomEvent('app:toast', { 
        detail: { 
          message: '🎉 Guide role request submitted successfully! An admin will review your request soon.', 
          type: 'success',
          duration: 5000
        } 
      }));
    } catch (err) {
      console.error('Request guide role failed:', err);
      window.dispatchEvent(new CustomEvent('app:toast', { 
        detail: { 
          message: err.response?.data?.error || 'Failed to submit request', 
          type: 'error' 
        } 
      }));
    } finally {
      setRequestLoading(false);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Validate password if provided
      if (formData.newPassword) {
        if (formData.newPassword.length < 8) {
          setError('Password must be at least 8 characters');
          setSaving(false);
          return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
          setError('Passwords do not match');
          setSaving(false);
          return;
        }
      }

      // Update Firebase profile (name) - only if name is provided and different
      const currentUser = auth.currentUser;
      if (currentUser && formData.name && formData.name.trim() && formData.name !== user?.name) {
        await updateProfile(currentUser, {
          displayName: formData.name.trim(),
        });
        // Force token refresh to update user data
        await currentUser.getIdToken(true);
      }

      // Update password if provided
      if (formData.newPassword && currentUser) {
        // Re-authenticate if needed (for requires-recent-login error)
        if (needsReauth && formData.currentPassword) {
          const credential = EmailAuthProvider.credential(
            currentUser.email,
            formData.currentPassword
          );
          await reauthenticateWithCredential(currentUser, credential);
          setNeedsReauth(false);
        }
        
        try {
          await updatePassword(currentUser, formData.newPassword);
          // Force token refresh after password change
          await currentUser.getIdToken(true);
        } catch (passwordErr) {
          if (passwordErr.code === 'auth/requires-recent-login') {
            setNeedsReauth(true);
            setError('Please enter your current password to change your password');
            setSaving(false);
            return;
          }
          throw passwordErr;
        }
      }

      // Update backend profile (only send fields that have values)
      const updateData = {};
      if (formData.name !== undefined) {
        updateData.name = formData.name.trim() || null;
      }
      if (formData.location !== undefined) {
        updateData.location = formData.location.trim() || null;
      }
      if (formData.bio !== undefined) {
        updateData.bio = formData.bio.trim() || null;
      }

      // Always call onSave even if only password was changed (to ensure backend is aware)
      // If no profile fields changed but password was updated, send empty object
      await onSave(updateData);

      // Small delay to ensure all updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));

      onClose();
    } catch (err) {
      console.error('Profile update error:', err);
      
      // Handle Firebase re-authentication error
      if (err.code === 'auth/requires-recent-login') {
        if (formData.newPassword) {
          setNeedsReauth(true);
          setError('Please enter your current password to change your password');
        } else {
          setError('This operation requires recent authentication. Please log out and log back in.');
        }
      } else if (err.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
        setNeedsReauth(true);
      } else {
        // Show more detailed error message
        const errorMessage = err?.response?.data?.error || err?.message || 'Failed to save profile';
        setError(errorMessage);
      }
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Profile"
        tabIndex="-1"
      >
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="form-group">
            <label htmlFor="name">Name (optional)</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Denver, Colorado"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows={5}
              className="form-textarea"
            />
          </div>

    

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Leave blank to keep current password"
              className="form-input"
            />
          </div>

          {formData.newPassword && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                className="form-input"
              />
            </div>
          )}

          {needsReauth && formData.newPassword && (
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password (required)</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                className="form-input"
                required
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                For security, please enter your current password to change it.
              </p>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          {/* Guide Role Request Section - Only for hikers */}
          {!isPublicView && user?.role === 'hiker' && (
            <div className="guide-request-section">
              <div className="section-divider"></div>
              <h3 className="section-title">Become a Guide</h3>
              <p className="section-description">
                Want to lead hikes? Request to become a guide and share your expertise with the community.
              </p>
              {hasPendingRequest ? (
                <div className="pending-request-badge">
                  ⏳ Guide Request Pending
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestGuideRole}
                  className="btn-request-guide"
                  disabled={requestLoading || saving}
                >
                  {requestLoading ? 'Submitting...' : '🚀 Request Guide Role'}
                </button>
              )}
            </div>
          )}

          <div className="form-actions">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {!isPublicView && onDelete ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-delete-account"
                  disabled={saving || deleteInProgress}
                >
                  {deleteInProgress ? 'Deleting...' : 'Delete Account'}
                </button>
              ) : null}
            </div>
            <div className="form-actions-right">
              <button
                type="button"
                onClick={onClose}
                className="btn-cancel"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-save"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        {showDeleteConfirm && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              zIndex: 10
            }}
          >
            <div 
              style={{
                background: 'white',
                padding: '24px',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '90%'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, color: '#dc2626' }}>Delete Account?</h3>
              <p style={{ color: '#374151' }}>
                Are you sure you want to permanently delete your account? This will remove your profile and anonymize personal data.
              </p>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-cancel"
                  disabled={deleteInProgress}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    if (onDelete) onDelete();
                  }}
                  className="btn-delete-account"
                  disabled={deleteInProgress}
                >
                  {deleteInProgress ? 'Deleting...' : 'Yes, Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

