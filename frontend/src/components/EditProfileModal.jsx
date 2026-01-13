import React, { useState, useEffect } from 'react';
import { auth, updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from '../firebase';
import './EditProfileModal.css';

export default function EditProfileModal({ isOpen, onClose, user, onSave, onDelete, deleteInProgress, isPublicView }) {
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
    }
  }, [isOpen, user]);

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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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

