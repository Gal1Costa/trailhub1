import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase";
import api, { deleteMe } from "../api";
import EditProfileModal from "../components/EditProfileModal";
import ConfirmDialog from '../components/ConfirmDialog';
import HikeCard from "../components/HikeCard";
import ReviewList from "../components/ReviewList";
import "./Profile.css";

export default function GuideProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("created");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPublicView, setIsPublicView] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [completedView, setCompletedView] = useState('created');
  const tabInitializedRef = useRef(false);
  const [authReady, setAuthReady] = useState(false);
  const [userReviews, setUserReviews] = useState([]);

  // Check auth and redirect if not guide
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
      const stateGuideId = location.state?.guideId;
      // Clear previous profile to avoid showing stale data while loading
      setMe(null);
      console.debug('[GuideProfile] load() called, location.state:', location.state, 'qsUserId:', qsUserId, 'resolved guideId:', stateGuideId);

      // Get current user profile to check if they're viewing their own profile
      let currentUserProfile = null;
      try {
        const currentUserRes = await api.get("/me");
        currentUserProfile = currentUserRes.data;
      } catch (e) {
        // User not logged in, that's okay
        console.debug('[GuideProfile] Could not get current user:', e.message);
      }

      let profile;
      if (stateGuideId) {
        // Public view via guide id passed in state
        const res = await api.get(`/guides/${String(stateGuideId)}`);
        const g = res.data;
        // Normalize guide response into the shape this component expects
        console.log('[GuideProfile] Guide API response (g):', g);
        profile = {
          id: g.user?.id || g.id,
          email: g.user?.email,
          name: g.user?.name || g.name,
          role: 'guide',
          guide: {
            ...g,
            id: g.id, // Guide ID from the API response - should always be present
          },
          createdHikes: g.hikes || g.createdHikes || [],
          bookings: g.bookings || [],
        };
        console.log('[GuideProfile] Profile constructed with guide.id:', profile.guide?.id);
        
        // Check if current user is the owner of this guide profile
        const isOwner = currentUserProfile && (
          currentUserProfile.id === profile.id ||
          (currentUserProfile.role === 'guide' && currentUserProfile.guide?.id && String(currentUserProfile.guide.id) === String(stateGuideId)) ||
          (currentUserProfile.role === 'guide' && currentUserProfile.guide?.id && profile.guide?.id && String(currentUserProfile.guide.id) === String(profile.guide.id))
        );
        setIsPublicView(!isOwner);
      } else if (qsUserId) {
        // Viewing a user by userId (querystring). If that user is a guide, fetch the richer guide endpoint.
        const res = await api.get(`/users/${String(qsUserId)}`);
        const tmp = res.data;
        if (tmp && tmp.role === 'guide' && tmp.guide && tmp.guide.id) {
          try {
            const guideRes = await api.get(`/guides/${String(tmp.guide.id)}`);
            const g = guideRes.data;
            profile = {
              id: g.user?.id || g.id,
              email: g.user?.email,
              name: g.user?.name || g.name,
              role: 'guide',
              guide: {
                ...g,
                id: g.id, // Guide ID from the API response - should always be present
              },
              createdHikes: g.hikes || g.createdHikes || [],
              bookings: g.bookings || [],
            };
          } catch (e) {
            profile = tmp;
          }
        } else {
          profile = tmp;
        }
        
        // Check if current user is the owner of this profile
        const isOwner = currentUserProfile && (
          currentUserProfile.id === profile.id ||
          (currentUserProfile.role === 'guide' && currentUserProfile.guide?.id && profile.guide?.id && String(currentUserProfile.guide.id) === String(profile.guide.id))
        );
        setIsPublicView(!isOwner);
      } else {
        // No guide id passed — load current user and, if they are a guide, fetch the canonical guide data
        const res = await api.get("/me", { params: { _t: Date.now() } });
        const meProfile = res.data;
        if (meProfile.role === 'guide') {
          // If guide record is present, use it; otherwise try to fetch user record which may include guide relation
          let guideIdCandidate = meProfile.guide?.id || null;
          if (!guideIdCandidate) {
            try {
              const userRes = await api.get(`/users/${String(meProfile.id)}`);
              const userObj = userRes.data;
              guideIdCandidate = userObj.guide?.id || null;
            } catch (e) {
              // ignore and fallback
            }
          }

          if (guideIdCandidate) {
            try {
            const guideRes = await api.get(`/guides/${String(guideIdCandidate)}`);
            const g = guideRes.data;
            console.log('[GuideProfile] Guide API response (g) for own profile:', g);
            profile = {
              id: g.user?.id || g.id,
              email: g.user?.email,
              name: g.user?.name || g.name,
              role: 'guide',
              guide: {
                ...g,
                id: g.id, // Guide ID from the API response - should always be present
              },
              createdHikes: g.hikes || g.createdHikes || [],
              bookings: g.bookings || [],
            };
            console.log('[GuideProfile] Profile constructed with guide.id:', profile.guide?.id);
              setIsPublicView(false);
            } catch (innerErr) {
              // If fetching guide endpoint fails, fall back to /api/me response
              profile = meProfile;
              setIsPublicView(false);
            }
          } else {
            // No guide record found, use meProfile as-is
            profile = meProfile;
            setIsPublicView(false);
          }
        } else {
          profile = meProfile;
          setIsPublicView(false);
        }
      }

      // Redirect non-guides only when viewing own profile
      if (!stateGuideId && !qsUserId && profile.role !== 'guide') {
        navigate("/profile/hiker");
        return;
      }

      console.log('[GuideProfile] Loaded profile:', { 
        id: profile.id, 
        email: profile.email, 
        name: profile.name, 
        role: profile.role,
        guideId: profile.guide?.id,
        guide: profile.guide 
      });
      setMe(profile);

      const now = new Date();
      let hikes = [];

      // For guides: show both created hikes AND joined hikes (bookings)
      const createdHikes = (Array.isArray(profile.createdHikes) ? profile.createdHikes : []).map((h) => ({
        ...h,
        imageUrl: h.coverUrl || h.imageUrl || null,
        isCreated: true,
      }));

      // Get joined hikes (bookings) 
      const createdHikeIds = new Set(createdHikes.map(h => h.id));
      const bookings = (Array.isArray(profile.bookings) ? profile.bookings : [])
        .filter((b) => b.hike && !createdHikeIds.has(b.hike.id))
        .map((b) => ({
          ...b.hike,
          imageUrl: b.hike.coverUrl || b.hike.imageUrl || null,
          isCreated: false,
        }));

      // Combine both lists
      hikes = [...createdHikes, ...bookings];

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

      // Load user's reviews to check which hikes need review (only for own profile)
      if (!stateGuideId && !qsUserId) {
        try {
          const reviewsRes = await api.get('/reviews/user/me');
          setUserReviews(reviewsRes.data || []);
        } catch (e) {
          console.warn('Failed to load user reviews:', e.message);
          setUserReviews([]);
        }
      } else {
        setUserReviews([]);
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
    // wait for Firebase auth initialization before loading profile
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthReady(true);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure we reload when auth is ready or when location state/search changes
  useEffect(() => {
    if (!authReady) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, location.key, location.search, location.state?.guideId]);

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
    () => {
      const upcomingArr = Array.isArray(upcoming) ? upcoming : [];
      const pastArr = Array.isArray(past) ? past : [];
      const createdHikes = upcomingArr.filter(h => h.isCreated).concat(pastArr.filter(h => h.isCreated));
      const upcomingJoined = upcomingArr.filter(h => !h.isCreated);

      return {
        total: (Array.isArray(upcoming) ? upcoming.length : 0) + (Array.isArray(past) ? past.length : 0),
        created: createdHikes.length,
        joined: upcomingJoined.length, // only upcoming joined hikes
        upcoming: Array.isArray(upcoming) ? upcoming.length : 0,
        completed: Array.isArray(past) ? past.length : 0,
      };
    },
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
          </div>
          <h1 className="profile-name">{me.name || me.email || "User"}</h1>
          <p className="profile-role">Guide</p>
          {me.guide?.location && (
            <p className="profile-location">
              {me.guide.location}
            </p>
          )}
          {joinDate && (
            <p className="profile-joined">Joined {joinDate}</p>
          )}
          {me.guide?.isVerified && (
            <p className="profile-verified" style={{ color: "#2f855a", fontSize: "14px", marginTop: "8px" }}>
              ✓ Verified Guide
            </p>
          )}
          {me.guide?.bio && (
            <p className="profile-bio">
              {me.guide.bio}
            </p>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-number">{counts.created || 0}</div>
          <div className="stat-label">Hikes Created</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{counts.joined || 0}</div>
          <div className="stat-label">Upcoming Joined Hikes</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{counts.total}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'created' ? 'active' : ''}`}
          onClick={() => setActiveTab('created')}
        >
          Created Hikes
        </button>
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
      {activeTab === 'created' ? (
        <div className="hikes-section">
          <h2 className="section-title">Upcoming Created Hikes</h2>
          {(() => {
            const upcomingArr = Array.isArray(upcoming) ? upcoming : [];
            const createdUpcoming = upcomingArr.filter(h => h.isCreated);
            if (createdUpcoming.length === 0) {
              return (
                <div className="empty-state">
                  {isPublicView ? (
                    <p>No upcoming hikes created.</p>
                  ) : (
                    <>
                      <p>No upcoming hikes created.</p>
                      <Link to="/hikes/create" className="btn-explore-hikes">
                        Create Hike
                      </Link>
                    </>
                  )}
                </div>
              );
            }

            return (
              <div className="hikes-list">
                {createdUpcoming.map((h) => (
                  <HikeCard
                    key={h.id}
                    hike={h}
                    isJoined={false}
                    allowJoin={false}
                    allowLeave={false}
                    userProfile={me}
                    fromProfile={true}
                    isPublicView={isPublicView}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      ) : activeTab === 'joined' ? (
        <div className="hikes-section">
          <h2 className="section-title">Upcoming Joined Hikes</h2>
          {(() => {
            const upcomingArr = Array.isArray(upcoming) ? upcoming : [];
            const joinedUpcoming = upcomingArr.filter(h => !h.isCreated);
            if (joinedUpcoming.length === 0) {
              return (
                <div className="empty-state">
                  {isPublicView ? (
                    <p>No upcoming joined hikes.</p>
                  ) : (
                    <>
                      <p>No upcoming joined hikes.</p>
                      <Link to="/explore" className="btn-explore-hikes">
                        Explore Hikes
                      </Link>
                    </>
                  )}
                </div>
              );
            }

            return (
              <div className="hikes-list">
                {joinedUpcoming.map((h) => (
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
            );
          })()}
        </div>
      ) : activeTab === 'completed' ? (
        <div className="hikes-section">
          <h2 className="section-title">Completed Hikes</h2>

          {/* Sub-navigation for completed hikes: Created (first) then Joined */}
          <div className="profile-tabs" style={{ marginBottom: 16 }}>
            <button
              className={`tab ${completedView === 'created' ? 'active' : ''}`}
              onClick={() => setCompletedView('created')}
            >
              Created
            </button>
            <button
              className={`tab ${completedView === 'joined' ? 'active' : ''}`}
              onClick={() => setCompletedView('joined')}
            >
              Joined
            </button>
          </div>

          {completedView === 'created' ? (
            (Array.isArray(past) ? past : []).filter(h => h.isCreated).length === 0 ? (
              <div className="empty-state">
                <p>No completed created hikes yet.</p>
              </div>
            ) : (
              <div className="hikes-list">
                {(Array.isArray(past) ? past : []).filter(h => h.isCreated).map((h) => (
                  <HikeCard
                    key={h.id}
                    hike={h}
                    isJoined={false}
                    allowJoin={false}
                    allowLeave={false}
                    userProfile={me}
                    fromProfile={true}
                    isPublicView={isPublicView}
                  />
                ))}
              </div>
            )
          ) : (
            (Array.isArray(past) ? past : []).filter(h => !h.isCreated).length === 0 ? (
              <div className="empty-state">
                <p>No completed joined hikes yet.</p>
              </div>
            ) : (
              <div className="hikes-list">
                {(Array.isArray(past) ? past : []).filter(h => !h.isCreated).map((h) => (
                  <HikeCard
                    key={h.id}
                    hike={h}
                    isJoined={true}
                    allowJoin={false}
                    allowLeave={false}
                    userProfile={me}
                    fromProfile={true}
                    needsReview={!isPublicView && !hasReviewedHike(h.id)}
                    isPublicView={isPublicView}
                  />
                ))}
              </div>
            )
          )}
        </div>
      ) : null}

      {/* Reviews Section */}
      {(() => {
        // Get the guide ID from the profile being viewed
        // The guide ID should be in me.guide.id when viewing a guide profile
        const guideId = me?.guide?.id;
        
        console.log('[GuideProfile] Reviews section - me:', me, 'guideId:', guideId);
        
        if (guideId) {
          return (
            <div className="reviews-section-container" style={{ marginTop: '24px' }}>
              <ReviewList guideId={guideId} title="Reviews for this Guide" />
            </div>
          );
        } else {
          return (
            <div className="reviews-section-container" style={{ marginTop: '24px' }}>
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                Unable to load reviews: Guide ID not found. Debug: me.guide = {JSON.stringify(me?.guide)}
              </div>
            </div>
          );
        }
      })()}

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
