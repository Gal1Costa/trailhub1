import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, onAuthStateChanged } from '../firebase';
import api from '../api';
import './Header.css';

export default function Header({ onOpenAuthModal }) {
  const [user, setUser] = useState(auth.currentUser);
  const [userRole, setUserRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef(null);
  const navigate = useNavigate();

  const fetchUserRole = useCallback(async () => {
    try {
      // Prefer /me. Fallback to /profile if older backend.
      const res = await api.get('/me').catch(() => api.get('/profile'));
      const role = res?.data?.role || null;

      setUserRole(role);

      // Do not expose admin affordances in the main header
    } catch (err) {
      console.error('[Header] Failed fetching role:', err);
      // If we can't confirm role, do NOT assume admin.
      setUserRole(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const holdForSignup = localStorage.getItem('holdHeaderForSignup') === '1';

      if (holdForSignup) {
        // Keep header in visitor state while signup flow signs out immediately
        if (!u) {
          localStorage.removeItem('holdHeaderForSignup');
        }
        setUser(null);
        setUserRole(null);
        return;
      }

      setUser(u);

      if (u) {
        fetchUserRole();
      } else {
        setUserRole(null);
        // No admin signaling from main header
      }
    });

    return () => unsub();
  }, [fetchUserRole]);

  // On hard reload where auth.currentUser is already set
  useEffect(() => {
    const holdForSignup = localStorage.getItem('holdHeaderForSignup') === '1';
    if (!holdForSignup && auth.currentUser) fetchUserRole();
  }, [fetchUserRole]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    // Use capture phase to handle clicks before they bubble
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    try {
      await auth.signOut();
      setUserRole(null);
      // Redirect based on previous role
      if (userRole === 'admin') {
        navigate('/admin/access');
      } else {
        navigate('/explore');
      }
    } catch (err) {
      console.error('Sign-out failed:', err);
      alert(err.message || 'Sign-out failed');
    }
  }

  const isVisitor = !user;
  const isGuide = userRole === 'guide';
  const isHiker = userRole === 'hiker';
  const isAdmin = userRole === 'admin';

  return (
    <header className="header">
      <div className="header-left">
        <Link to={isAdmin ? "/admin" : "/explore"} className="logo">
          <img src="/exploreicon.png" alt="TrailHub" className="logo-image" />
          <span className="logo-text">TrailHub</span>
        </Link>
      </div>

      <div className="header-right">
        {isVisitor && (
          <>
            <button onClick={() => onOpenAuthModal('login')} className="btn-login">
              Log In
            </button>
            <button onClick={() => onOpenAuthModal('signup')} className="btn-signup">
              Sign Up
            </button>
          </>
        )}

        {!isVisitor && (
          <>
            {(isGuide || isHiker) && (
              <div className="menu-container" ref={menuContainerRef}>
                <button onClick={() => setMenuOpen(!menuOpen)} className="hamburger-btn">
                  <div className="hamburger-line"></div>
                  <div className="hamburger-line"></div>
                  <div className="hamburger-line"></div>
                </button>
                {menuOpen && (
                  <div className="dropdown-menu">
                    {isGuide && (
                      <Link to="/hikes/create" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                        Create Hike
                      </Link>
                    )}
                    <Link to="/mytrails" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      My Trails
                    </Link>
                    <Link to={isGuide ? "/profile/guide" : "/profile/hiker"} className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      Profile
                    </Link>
                    <button onClick={() => { handleSignOut(); setMenuOpen(false); }} className="dropdown-item dropdown-signout">
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {isAdmin && (
              <button onClick={handleSignOut} className="btn-signout">
                Sign Out
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
