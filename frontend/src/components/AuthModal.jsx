import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './authModal.css';
import api from '../api';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from '../firebase';

// Validation constants
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;

export default function AuthModal({ open, onClose, initialTab = 'login' }) {
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);
  const [manualTab, setManualTab] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('hiker');
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setManualTab(null);

    if (open) {
      setEmailError('');
      setPasswordError('');
      setNameError('');
      setFormError('');
      setEmail('');
      setPassword('');
      setFullName('');
      setSelectedRole('hiker');
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;

    const header = document.querySelector('header');
    if (header) {
      header.setAttribute('aria-hidden', 'true');
      header.setAttribute('inert', '');
    }

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

      if (header) {
        header.removeAttribute('aria-hidden');
        header.removeAttribute('inert');
      }

      if (previouslyFocused.current && previouslyFocused.current.focus) {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose]);

  const tab = manualTab !== null ? manualTab : (initialTab || 'login');

  const validateEmail = (value) => {
    if (!value) {
      setEmailError('');
      return true;
    }
    if (value.length > MAX_EMAIL_LENGTH) {
      setEmailError(`Email must be no more than ${MAX_EMAIL_LENGTH} characters`);
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('');
      return true;
    }
    if (value.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return false;
    }
    if (value.length > MAX_PASSWORD_LENGTH) {
      setPasswordError(`Password must be no more than ${MAX_PASSWORD_LENGTH} characters`);
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateName = (value) => {
    if (!value) {
      setNameError('');
      return true;
    }
    if (value.length > MAX_NAME_LENGTH) {
      setNameError(`Name must be no more than ${MAX_NAME_LENGTH} characters`);
      return false;
    }
    setNameError('');
    return true;
  };

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setEmailError('');
    setPasswordError('');
    setNameError('');
    setFormError('');

    let isValid = true;

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else {
      isValid = validateEmail(email) && isValid;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else {
      isValid = validatePassword(password) && isValid;
    }

    if (tab === 'signup') {
      if (!fullName.trim()) {
        setNameError('Name is required');
        isValid = false;
      } else {
        isValid = validateName(fullName) && isValid;
      }
    }

    if (!isValid) return;

    setLoading(true);

    try {
      if (tab === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        
        // SECURITY: Check if logged-in user is admin (by UID) and reject
        // We need to check BEFORE signing out to avoid race conditions with route guards
        let isAdmin = false;
        try {
          const profileRes = await api.get('/me');
          const userRole = profileRes?.data?.role;
          isAdmin = userRole === 'admin';
        } catch (checkError) {
          // If account is deleted, sign out immediately and show error
          if (checkError?.response?.status === 401 && 
              checkError?.response?.data?.error === 'Account deleted') {
            await auth.signOut();
            setFormError('This account has been deleted and cannot be used to log in.');
            setLoading(false);
            return;
          }
          // Other errors are non-fatal for login flow
        }
        
        // If admin detected, sign out immediately and show generic error
        // This prevents any route guards from redirecting
        if (isAdmin) {
          await auth.signOut();
          // Clear form error and show generic error message like a normal failed login
          setFormError('');
          setPasswordError('Invalid email or password');
          setLoading(false);
          return;
        }
        
        onClose();
        return;
      }

      // SIGNUP flow
      localStorage.setItem('holdHeaderForSignup', '1');
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      // SECURITY: Check if created user's UID is admin and reject
      try {
        const profileRes = await api.get('/me');
        const userRole = profileRes?.data?.role;
        
        if (userRole === 'admin') {
          // Delete the Firebase account we just created
          await auth.signOut();
          try {
            // Note: We can't delete Firebase account from frontend, but backend will reject registration
            // The account will remain in Firebase but won't be usable
          } catch (e) {}
          setFormError('This account is registered as an administrator and cannot be used for registration.');
          setLoading(false);
          return;
        }
      } catch (checkError) {
        // If registration check fails, continue with normal flow
        // Backend will also validate and reject if needed
      }

      // Set Firebase displayName (safe and normal)
      try {
        await updateProfile(userCred.user, { displayName: fullName.trim() });
      } catch (e) {
        // not fatal
      }

      // Register user in DB.
      // IMPORTANT: This call should create/ensure a User row with role 'hiker' or 'guide'.
      // Backend must NOT trust role='admin' from clients.
      await api.post('/users/register', {
        firebaseUid: userCred.user.uid,
        email: email.trim(),
        name: fullName.trim(),
        role: selectedRole, // 'hiker' or 'guide'
      });

      // Optional: if you WANT manual login after signup, sign out here:
      await auth.signOut();
      localStorage.removeItem('holdHeaderForSignup');

      // Switch to login tab, keep email filled, clear password
      setManualTab('login');
      setPassword('');
      setFullName('');
      setSelectedRole('hiker');
      setNameError('');
      setPasswordError('');
      setEmailError('');
      setFormError('');
    } catch (err) {
      localStorage.removeItem('holdHeaderForSignup');
      console.error('Auth error', err);

      const code = err?.code;

      if (code === 'auth/email-already-in-use') {
        setEmailError('This email is already registered. Please log in.');
      } else if (code === 'auth/invalid-email') {
        setEmailError('Please enter a valid email address');
      } else if (code === 'auth/weak-password') {
        setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      } else if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setPasswordError('Invalid email or password');
      } else if (code === 'auth/user-disabled') {
        setFormError('This account has been disabled. Contact support if you believe this is an error.');
      } else if (code === 'auth/too-many-requests') {
        setFormError('Too many failed attempts. Try again later or reset your password.');
      } else if (code === 'auth/network-request-failed') {
        setFormError('Network error. Check your connection and try again.');
      } else if (code === 'auth/configuration-not-found') {
        setFormError(
          'Firebase Auth is not configured. Enable Email/Password in Firebase Console (Authentication → Sign-in method).'
        );
      } else {
        // Axios errors: show backend message if present
        const backendMsg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Authentication failed';
        setFormError(backendMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-modal-overlay"
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Authentication"
        tabIndex="-1"
        ref={modalRef}
      >
        <button className="auth-modal-close" onClick={onClose}>×</button>
        <h3 className="auth-modal-title">Welcome to TrailHub</h3>

        <div className="auth-tabs">
          <button
            className={'auth-tab ' + (tab === 'login' ? 'active' : '')}
            onClick={() => setManualTab('login')}
            type="button"
          >
            Log In
          </button>
          <button
            className={'auth-tab ' + (tab === 'signup' ? 'active' : '')}
            onClick={() => setManualTab('signup')}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {formError && <div className="auth-error" style={{ marginBottom: 10 }}>{formError}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {tab === 'signup' && (
            <>
              <label className="auth-label">Full Name</label>
              <input
                className={`auth-input ${nameError ? 'auth-input-error' : ''}`}
                type="text"
                value={fullName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_NAME_LENGTH) {
                    setFullName(value);
                    validateName(value);
                  }
                }}
                placeholder="Your name"
                maxLength={MAX_NAME_LENGTH}
              />
              {nameError && <div className="auth-error">{nameError}</div>}
            </>
          )}

          <label className="auth-label">Email</label>
          <input
            className={`auth-input ${emailError ? 'auth-input-error' : ''}`}
            type="email"
            value={email}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= MAX_EMAIL_LENGTH) {
                setEmail(value);
                validateEmail(value);
              }
            }}
            onBlur={() => validateEmail(email)}
            placeholder="your@email.com"
            maxLength={MAX_EMAIL_LENGTH}
          />
          {emailError && <div className="auth-error">{emailError}</div>}

          <label className="auth-label">Password</label>
          <div className="auth-password-container">
            <input
              className={`auth-input ${passwordError ? 'auth-input-error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= MAX_PASSWORD_LENGTH) {
                  setPassword(value);
                  validatePassword(value);
                }
              }}
              onBlur={() => validatePassword(password)}
              placeholder="********"
              maxLength={MAX_PASSWORD_LENGTH}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {passwordError && <div className="auth-error">{passwordError}</div>}

          {tab === 'signup' && (
            <>
              <div className="auth-label" style={{ marginTop: 10 }}>I want to join as</div>
              <div className="role-grid">
                <button
                  type="button"
                  className={'role-card ' + (selectedRole === 'hiker' ? 'selected' : '')}
                  onClick={() => setSelectedRole('hiker')}
                >
                  <div className="role-icon">👣</div>
                  <div className="role-title">Hiker</div>
                  <div className="role-sub">Join hikes & explore</div>
                </button>
                <button
                  type="button"
                  className={'role-card ' + (selectedRole === 'guide' ? 'selected' : '')}
                  onClick={() => setSelectedRole('guide')}
                >
                  <div className="role-icon">🧭</div>
                  <div className="role-title">Guide</div>
                  <div className="role-sub">Lead & create hikes</div>
                </button>
              </div>
            </>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : (tab === 'login'
                ? 'Log In'
                : `Sign Up as ${selectedRole === 'guide' ? 'Guide' : 'Hiker'}`)}
          </button>
        </form>
      </div>
    </div>
  );
}
