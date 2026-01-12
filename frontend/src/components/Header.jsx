import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, onAuthStateChanged } from '../firebase';
import api from '../api';
import './Header.css';
import logoImg from 'fronted/src/assests/TH.jpg';

export default function Header({ onOpenAuthModal }) {
  const [user, setUser] = useState(auth.currentUser);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); // for tooltip

  const fetchUserRole = useCallback(async () => {
    try {
      const res = await api.get('/me').catch(() => api.get('/profile'));
      setUserRole(res?.data?.role || null);
    } catch (err) {
      console.error('[Header] Failed fetching role:', err);
      setUserRole(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchUserRole();
      else setUserRole(null);
    });
    return () => unsub();
  }, [fetchUserRole]);

  useEffect(() => {
    if (auth.currentUser) fetchUserRole();
  }, [fetchUserRole]);

  async function handleSignOut() {
    try {
      await auth.signOut();
      setUserRole(null);
      navigate('/explore');
    } catch (err) {
      console.error('Sign-out failed:', err);
      alert(err.message || 'Sign-out failed');
    }
  }

  const isVisitor = !user;
  const isGuide = userRole === 'guide';
  const isHiker = userRole === 'hiker';

  // map route paths to nice page names
  const pageNames = {
    '/explore': 'Explore',
    '/hikes/create': 'Create Hike',
    '/mytrails': 'My Trails',
    '/profile/guide': 'Profile (Guide)',
    '/profile/hiker': 'Profile (Hiker)',
  };

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/explore" className="logo">
          <img src={logoImg} alt="TrailHub logo" />
          TrailHub
        </Link>

        {/* Tooltip showing current page */}
        <span className="current-page-tooltip">
          {pageNames[location.pathname] || 'Unknown Page'}
        </span>
      </div>

      <nav className="nav-links">
        <Link to="/explore">Home</Link>
        {isGuide && <>
          <Link to="/hikes/create">Create Hike</Link>
          <Link to="/mytrails">My Trails</Link>
        </>}
        {isHiker && <Link to="/mytrails">My Trails</Link>}
      </nav>

      <div className="header-right">
        {isVisitor && <>
          <button onClick={() => onOpenAuthModal('login')} className="btn-login">
            Log In
          </button>
          <button onClick={() => onOpenAuthModal('signup')} className="btn-signup">
            Sign Up
          </button>
        </>}

        {!isVisitor && <>
          <Link to={isGuide ? "/profile/guide" : "/profile/hiker"} className="profile-icon-link">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="profile" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                {(user?.displayName?.[0] || user?.email?.[0] || 'U')}
              </div>
            )}
          </Link>
          <button onClick={handleSignOut} className="btn-signout">Sign Out</button>
        </>}
      </div>
    </header>
  );
}
