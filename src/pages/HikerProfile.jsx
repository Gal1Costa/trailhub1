import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase";
import api, { deleteMe } from "../api";
import EditProfileModal from "../components/EditProfileModal";
import ConfirmDialog from '../components/ConfirmDialog';
import HikeCard from "../components/HikeCard";
import "./Profile.css";

export default function HikerProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("joined");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [isPublicView, setIsPublicView] = useState(false);
  const tabInitializedRef = useRef(false);
  const [authReady, setAuthReady] = useState(false);
  const [userReviews, setUserReviews] = useState([]);

  // Check auth and redirect if not hiker
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthReady(true);
    });
    return () => unsub();
  }, [navigate]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams(location.search);
      const qsUserId = params.get('user');
      const stateUserId = location.state?.userId;
      const userId = stateUserId || qsUserId;
      // Clear previous profile to avoid showing stale data while loading
      setMe(null);

      let profile;
      console.debug('[HikerProfile] load() called, location.state:', location.state, 'qsUserId:', qsUserId, 'resolved userId:', userId);
      if (userId) {
        // public view of another user (from state or querystring)
        const res = await api.get(`/users/${String(userId)}`);
        profile = res.data;
        setIsPublicView(true);
        // If the user we're viewing is a guide, forward to the guide profile route
        if (profile && profile.role === 'guide') {
          const guideId = profile.guide?.id || null;
          navigate('/profile/guide', { state: { guideId, guideName: profile.name } });
          return;
        }
      } else {
        const res = await api.get("/me", { params: { _t: Date.now() } });
        profile = res.data;
        setIsPublicView(false);
      }
      
      // If viewing another user's profile, do not redirect based on role
      if (!userId && profile.role === 'guide') {
        navigate("/profile/guide");
        return;
      }

      console.log('[HikerProfile] Loaded profile:', { id: profile.id, email: profile.email, name: profile.name, role: profile.role });
      setMe(profile);

      const now = new Date();
      
      // For hikers: show bookings (hikes they joined)
      const bookings = Array.isArray(profile.bookings) ? profile.bookings : [];
      const hikes = (Array.isArray(bookings) ? bookings : [])
        .filter((b) => b.hike)
        .map((b) => ({
          ...b.hike,
          imageUrl: b.hike.coverUrl || b.hike.imageUrl || null,
          isCreated: false,
        }));

      const upcomingHikes = hikes.filter((h) => {
        if (!h.date) return false;
        
        // Combine date and meetingTime for accurate comparison
        const hikeDate = new Date(h.date);
        
        // If meetingTime exists, combine it with the date
        if (h.meetingTime) {
          const [hours, minutes] = h.meetingTime.split(':').map(Number);
          hikeDate.setHours(hours, minutes, 0, 0);
        } else {
          // If no time specified, set to end of day to keep upcoming
          hikeDate.setHours(23, 59, 59, 999);
        }
        
        return hikeDate >= now;
      });

      const pastHikes = hikes.filter((h) => {
        if (!h.date) return false;
        
        // Combine date and meetingTime for accurate comparison
        const hikeDate = new Date(h.date);
        
        // If meetingTime exists, combine it with the date
        if (h.meetingTime) {
          const [hours, minutes] = h.meetingTime.split(':').map(Number);
          hikeDate.setHours(hours, minutes, 0, 0);
        } else {
          // If no time specified, set to end of day to keep upcoming
          hikeDate.setHours(23, 59, 59, 999);
        }
        
        return hikeDate < now;
      });

      setUpcoming(upcomingHikes);
      setPast(pastHikes);

      // Load user's reviews to check which hikes need review
      if (!userId) {
        try {
          const reviewsRes = await api.get('/reviews/user/me');
          setUserReviews(reviewsRes.data || []);
        } catch (e) {
          console.warn('Failed to load user reviews:', e.message);
          setUserReviews([]);
        }
      }
    } catch (e) {
      console.error("Failed to load profile", e);
      setErr(
        e?.response?.data?.error || e.message || "Failed to load profile"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;
    load();
    // Re-run when location/state changes (so navigating with state reloads the correct profile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, location.key, location.search, location.state?.userId]);

  // Make header inactive when edit modal opens (same as AuthModal)
  useEffect(() => {
    const header = document.querySelector('header');
    
    if (isEditModalOpen && header) {
      header.setAttribute('aria-hidden', 'true');
      header.setAttribute('inert', '');
    } else if (header) {
      header.removeAttribute('aria-hidden');
      header.removeAttribute('inert');
    }
    
    // Cleanup on unmount
    return () => {
      if (header) {
        header.removeAttribute('aria-hidden');
        header.removeAttribute('inert');
      }
    };
  }, [isEditModalOpen]);

  const counts = useMemo(
    () => ({
      total: (upcoming?.length || 0) + (past?.length || 0),
      upcoming: upcoming?.length || 0,
      completed: past?.length || 0,
    }),
    [upcoming, past]
  );

  const hasReviewedHike = (hikeId) => {
    return userReviews.some(review => review.hikeId === hikeId);
  };

  async function handleLeave(hikeId) {
    try {
      await api.delete(`/hikes/${hikeId}/join`);
      await load();
    } catch (e) {
      console.error("Leave failed", e);
      alert(e?.response?.data?.error || "Failed to leave hike");
    }
  }

  async function handleSaveProfile(formData) {
    try {
      await api.patch('/users/profile', formData);
      await load();
    } catch (e) {
      console.error("Save profile failed", e);
      throw new Error(e?.response?.data?.error || "Failed to save profile");
    }
  }

  if (loading) return <div className="profile-loading">Loading…</div>;
  if (err && !me) return <div className="profile-error">Error: {err}</div>;
  if (!me) return <div className="profile-error">Could not load profile.</div>;

  const joinDate = me.createdAt
    ? new Date(me.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const userInitial = (me.name?.[0] || me.email?.[0] || 'U').toUpperCase();

  return (
    <div className="profile-page">
      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-avatar-large">
          {userInitial}
        </div>
        <div className="profile-info">
          <div className="profile-header-actions">
            {!isPublicView && (
              <button 
                className="btn-edit-profile"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit Profile
              </button>
            )}
            {/* delete moved to Danger Zone section below for owner-only visibility */}
          </div>
          <h1 className="profile-name">{me.name || me.email || "User"}</h1>
          <p className="profile-role">Hiker</p>
          {me.hikerProfile?.location && (
            <p className="profile-location">
              {me.hikerProfile.location}
            </p>
          )}
          {joinDate && (
            <p className="profile-joined">Joined {joinDate}</p>
          )}
          {me.hikerProfile?.bio && (
            <p className="profile-bio">
              {me.hikerProfile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-number">{counts.total}</div>
          <div className="stat-label">Upcoming Joined Hikes</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{counts.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{counts.upcoming}</div>
          <div className="stat-label">Upcoming</div>
        </div>
      </div>



      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'joined' ? 'active' : ''}`}
          onClick={() => setActiveTab('joined')}
        >
          Joined Hikes
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'joined' ? (
        <div className="hikes-section">
          <h2 className="section-title">Upcoming Hikes</h2>
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming joined hikes.</p>
              <Link to="/explore" className="btn-explore-hikes">
                Explore Hikes
              </Link>
            </div>
          ) : (
            <div className="hikes-list">
              {upcoming.map((h) => (
                <HikeCard
                  key={h.id}
                  hike={h}
                  isJoined={true}
                  onLeave={(id) => handleLeave(id)}
                  allowJoin={false}
                  allowLeave={!isPublicView}
                  userProfile={me}
                  fromProfile={true}
                  isPublicView={isPublicView}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'completed' ? (
        <div className="hikes-section">
          <h2 className="section-title">Completed Hikes</h2>
          {past.length === 0 ? (
            <div className="empty-state">
              <p>No completed hikes yet.</p>
            </div>
          ) : (
            <div className="hikes-list">
              {past.map((h) => (
                <HikeCard
                  key={h.id}
                  hike={h}
                  isJoined={true}
                  onLeave={(id) => handleLeave(id)}
                  allowJoin={false}
                  allowLeave={false}
                  userProfile={me}
                  fromProfile={true}
                  needsReview={!isPublicView && !hasReviewedHike(h.id)}
                  isPublicView={isPublicView}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={me}
        onSave={handleSaveProfile}
        onDelete={async () => {
          setDeleteInProgress(true);
          setDeleteError(null);
          try {
            await deleteMe();
            try { await auth.signOut(); } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Account deleted', type: 'success' } })); } catch (e) {}
            window.location.href = '/explore';
          } catch (e) {
            console.error('Account deletion failed', e);
            // If 401 Account deleted, treat as success and sign out
            if (e?.response?.status === 401 || e?.response?.data?.error === 'Account deleted') {
              try { await auth.signOut(); } catch (signOutErr) {}
              try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Account deleted', type: 'success' } })); } catch (toastErr) {}
              window.location.href = '/explore';
            } else {
              setDeleteError(e?.response?.data?.error || e.message || 'Failed to delete account');
              setDeleteInProgress(false);
            }
          }
        }}
        deleteInProgress={deleteInProgress}
        isPublicView={isPublicView}
      />
    </div>
  );
}
