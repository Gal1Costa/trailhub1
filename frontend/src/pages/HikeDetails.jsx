import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase";
import api from "../api";
import ReviewCard from "../components/ReviewCard";
import EditHikeForm from "../components/EditHikeForm";
import MapRoute from '../components/create/MapRoute';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import { createDestinationMarkers, createStartEndMarkers } from "../utils/mapUtils.jsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./HikeDetails.css";

// Fix Leaflet marker icons for bundlers (Vite/Webpack)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component to fit map bounds to route
function FitBounds({ positions }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  
  return null;
}

export default function HikeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [hike, setHike] = useState(null);
  const [joinedIds, setJoinedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [user, setUser] = useState(auth.currentUser);
  const [userProfile, setUserProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Clear joined IDs when user logs out
      if (!u) {
        setJoinedIds([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // Always load hike details
      const hikeRes = await api.get(`/hikes/${id}`);
      setHike(hikeRes.data || null);
      console.log('[HikeDetails] Loaded hike data:', {
        id: hikeRes.data?.id,
        title: hikeRes.data?.title,
        imageUrl: hikeRes.data?.imageUrl?.substring(0, 50) + '...',
        hasRoute: !!hikeRes.data?.route,
        routeLength: hikeRes.data?.route?.length,
        routeData: hikeRes.data?.route,
        hasDestinations: !!hikeRes.data?.destinations,
        destinationsLength: hikeRes.data?.destinations?.length,
        mapMode: hikeRes.data?.mapMode
      });

  // Only load profile/bookings if user is logged in and auth is ready
  if (authReady && user) {
        try {
          const profileRes = await api.get("/me");
          const profile = profileRes.data;
          setUserProfile(profile);
          const bookings = profile?.bookings || [];
          const joined = bookings.filter((b) => b.hikeId).map((b) => b.hikeId);
          setJoinedIds(joined);

          // Check if user has already reviewed this hike
          try {
            const reviewsRes = await api.get('/reviews/user/me');
            const userReviews = reviewsRes.data || [];
            const hasReviewedThisHike = userReviews.some(review => review.hikeId === id);
            setHasReviewed(hasReviewedThisHike);
          } catch (reviewErr) {
            console.warn('Failed to load user reviews:', reviewErr);
            setHasReviewed(false);
          }
        } catch (profileErr) {
          // If profile fails, user might not be authenticated
          console.warn("Failed to load profile:", profileErr);
          setJoinedIds([]);
          setUserProfile(null);
          setHasReviewed(false);
        }
      } else {
        // User is not logged in, clear joined IDs
        setJoinedIds([]);
        setUserProfile(null);
        setHasReviewed(false);
      }
    } catch (e) {
      console.error("Failed to load hike details", e);
      setErr(
        e?.response?.data?.error || e.message || "Failed to load hike details"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, id, user]);

  // Make header inactive when delete confirmation dialog opens (same as AuthModal)
  useEffect(() => {
    if (!deleteConfirmOpen) return;

    const header = document.querySelector('header');
    if (header) {
      header.setAttribute('aria-hidden', 'true');
      header.setAttribute('inert', '');
    }

    return () => {
      if (header) {
        header.removeAttribute('aria-hidden');
        header.removeAttribute('inert');
      }
    };
  }, [deleteConfirmOpen]);

  const joinedSet = useMemo(() => new Set(joinedIds), [joinedIds]);
  
  // Check if user participated in this hike (for past hikes, check participants list)
  const isParticipant = useMemo(() => {
    if (!user || !hike) return false;
    // Check if user is in participants list
    if (hike.participants && Array.isArray(hike.participants)) {
      return hike.participants.some(p => p.firebaseUid === user.uid || p.email === user.email);
    }
    return false;
  }, [hike, user]);

  async function handleJoin() {
    // If user is not logged in, trigger login modal via custom event
    if (!user) {
      // Dispatch custom event to open auth modal
      window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
      return;
    }

    try {
      await api.post(`/hikes/${id}/join`);
      await load();
    } catch (e) {
      console.error("Join failed", e);
      // If unauthorized, trigger login modal
      if (e?.response?.status === 401) {
        window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
      } else {
        alert(e?.response?.data?.error || "Failed to join hike");
      }
    }
  }

  async function handleLeave() {
    try {
      await api.delete(`/hikes/${id}/join`);
      await load();
    } catch (e) {
      console.error("Leave failed", e);
      alert(e?.response?.data?.error || "Failed to leave hike");
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading hike…</div>;
  if (err && !hike) return <div style={{ padding: 16 }}>Error: {err}</div>;
  if (!hike) return <div style={{ padding: 16 }}>Hike not found.</div>;

  const date = hike.date || hike.createdAt;
  const d = date ? new Date(date) : null;
  const now = new Date();
  
  // Determine if hike is past by combining date and meetingTime
  const isPast = (() => {
    if (!d) return false;
    
    const hikeDate = new Date(d);
    
    // If meetingTime exists, combine it with the date
    if (hike.meetingTime) {
      const [hours, minutes] = hike.meetingTime.split(':').map(Number);
      hikeDate.setHours(hours, minutes, 0, 0);
    } else {
      // If no time specified, set to end of day to keep upcoming
      hikeDate.setHours(23, 59, 59, 999);
    }
    
    return hikeDate < now;
  })();

  const participantsCount = hike.participantsCount ?? 0;
  const capacity = hike.capacity ?? 0;
  
  // Filter out deleted users from participants and get accurate count
  const activeParticipants = hike.participants ? hike.participants.filter(p => p.name !== 'Deleted User') : [];
  const activeParticipantsCount = activeParticipants.length;
  
  const isFull =
    hike.isFull || (capacity > 0 && activeParticipantsCount >= capacity);
  const isJoined = joinedSet.has(hike.id);

  // Check if current user is the creator of this hike
  const isCreator = userProfile && (
    (userProfile.role === 'guide' && userProfile.createdHikes?.some(h => h.id === hike.id)) ||
    (hike.guideId && userProfile.guide?.id === hike.guideId)
  );

  let buttonLabel = "";
  let buttonDisabled = true;
  let buttonOnClick = null;

  if (isPast) {
    buttonLabel = "Past";
    buttonDisabled = true;
  } else if (isCreator) {
    // User created this hike, they cannot join it
    buttonLabel = "Your Hike";
    buttonDisabled = true;
  } else if (isJoined) {
    buttonLabel = "Leave";
    buttonDisabled = false;
    buttonOnClick = handleLeave;
  } else if (isFull) {
    buttonLabel = "Full";
    buttonDisabled = true;
  } else {
    buttonLabel = "Join";
    buttonDisabled = false;
    buttonOnClick = handleJoin;
  }
  // Determine back link: if navigated from profile, go back to profile
  const fromProfile = location.state && location.state.fromProfile;
  const backLink = fromProfile ? '/profile' : '/';
  const backLabel = fromProfile ? 'Back to Profile' : 'Back to Explore';

  async function handleDelete() {
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    setDeleteConfirmOpen(false);
    setDeleting(true);
    try {
      const response = await api.delete(`/hikes/${hike.id}`);
      // Success - navigate to profile
      navigate('/profile');
    } catch (e) {
      console.error('Delete hike failed:', e);
      const errorMessage = e?.response?.data?.error || e?.message || 'Failed to delete hike';
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  }


  return (
    <div className="hike-details-page">
      <div className="hike-details-wrapper">
        {/* Green background visible with image container shadow */}
        {hike.imageUrl && (
          <div className="cover-image-container" style={{ position: 'relative', marginLeft: -20, marginRight: -20, marginTop: 20, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
            <img 
              src={`${hike.imageUrl.startsWith('/') ? `${api.defaults.baseURL}${hike.imageUrl}` : hike.imageUrl}${hike.imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
              alt={hike.title || hike.name} 
              style={{ width: '100%', height: 320, objectFit: 'cover', display: 'block' }} 
              key={hike.imageUrl}
            />
            <button onClick={() => navigate(backLink)} aria-label="Back" style={{ position: 'absolute', left: 12, top: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', padding: 8, borderRadius: 8, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
              ←
            </button>
          </div>
        )}

      {/* Content container with padding */}
      <div style={{ padding: 16 }}>
        <div className="hike-details-grid">
          {/* Left (main) column */}
          <div className="main-content-mobile">
            {/* Title below image */}
            <h2 style={{ marginTop: 8 }}>{hike.name || hike.title || "Untitled hike"}</h2>

            {/* Basic Information Section */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📍</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{hike.location || 'Not specified'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>👥</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {activeParticipantsCount}{capacity ? ` / ${capacity}` : ''} {isFull ? '(Full)' : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>💰</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{hike.price ? `$${hike.price}` : 'Free'}</div>
                </div>
              </div>
            </div>


          <hr style={{ border: 'none', borderTop: '1px solid #e6eef0', margin: '18px 0' }} />

          <h3 style={{ marginTop: 0 }}>About This Hike</h3>
          {hike.description ? (
            <p style={{ marginTop: 8 }}>{hike.description}</p>
          ) : (
            <p style={{ color: '#666' }}>No description provided.</p>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #e6eef0', margin: '18px 0' }} />

          <h3 style={{ marginTop: 0 }}>What to Bring</h3>
          {hike.whatToBring ? (
            (() => {
              const items = (typeof hike.whatToBring === 'string' ? hike.whatToBring.split('\n') : Array.isArray(hike.whatToBring) ? hike.whatToBring : []).filter(Boolean);
              if (items.length === 0) return <p style={{ color: '#666' }}>No items listed.</p>;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 10, height: 10, background: '#2d6a4f', borderRadius: 2, marginTop: 6 }} />
                      <div style={{ fontSize: 14 }}>{it}</div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <p style={{ color: '#666' }}>No suggestions provided.</p>
          )}

          {/* Non-edit Route Map (visible when route exists and not in edit mode) */}
          {!editMode && Array.isArray(hike.route) && hike.route.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>Route Map</h3>
              <div className="hike-map" style={{ height: 360, width: '100%', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
                <MapContainer
                  key={`map-${hike.id}-${JSON.stringify(hike.route)}`}
                  center={
                    hike.mapLocation?.lat && hike.mapLocation?.lng
                      ? [hike.mapLocation.lat, hike.mapLocation.lng]
                      : hike.route[0]
                  }
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                  <FitBounds positions={hike.route} />
                  <Polyline positions={hike.route} color="#2d6a4f" weight={4} opacity={0.8} />
                  {createStartEndMarkers(hike.route)}
                </MapContainer>
              </div>
              
              {/* Destinations list if in destinations mode */}
              {Array.isArray(hike.destinations) && hike.destinations.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16, color: '#111827' }}>Destinations</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {hike.destinations.map((dest, index) => (
                      <div 
                        key={dest.id || index} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 12, 
                          padding: '10px 12px', 
                          background: '#f9fafb', 
                          borderRadius: 8,
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ 
                          minWidth: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          background: '#10b981', 
                          color: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 700, 
                          fontSize: 13 
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
                          {dest.name || `Destination ${index + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Participants section after Trail Map & Route */}
          {activeParticipants.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ marginTop: 0 }}>Participants</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginTop: 8 }}>
                {activeParticipants.map((p) => (
                  <button key={p.id} onClick={() => {
                    if (!user) {
                      window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
                      return;
                    }
                    if (p.guideId) {
                      navigate('/profile/guide', { state: { guideId: p.guideId, guideName: p.name, guidePhoto: p.photoUrl } });
                    } else {
                      navigate('/profile/hiker', { state: { userId: p.id, userName: p.name, userPhoto: p.photoUrl } });
                    }
                  }} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, borderRadius: 8, border: '1px solid #eee', background: '#fff', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#e6eef0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2d6a4f', overflow: 'hidden' }}>
                      {p.photoUrl ? (
                        <img src={p.photoUrl.startsWith('/') ? `${api.defaults.baseURL}${p.photoUrl}` : p.photoUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span>{(p.name || 'P').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="participant-name" style={{ textAlign: 'left' }}>{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeParticipantsCount > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ marginTop: 0 }}>Participants</h4>
                <div style={{ fontSize: 13, color: '#444' }}><strong>Joined:</strong> {activeParticipantsCount}{capacity ? ` / ${capacity}` : ''} {isFull ? '(Full)' : ''}</div>
              </div>
            )
          )}

          {/* Owner actions (keeps existing edit UI below) */}

          </div>

          {/* Right (sidebar) column */}
          <aside className="right-section-mobile" style={{ width: '100%' }}>
            {/* Join / leave container */}
            {isCreator ? (
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', textAlign: 'center', color: '#2d6a4f', fontWeight: 500 }}>
                You are the creator of this hike
              </div>
            ) : (
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fff' }}>
                {isPast ? (
                  <button 
                    className="btn-cancel"
                    disabled
                    title="This hike is in the past"
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px', 
                      borderRadius: 8,
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      color: '#9ca3af',
                      cursor: 'not-allowed',
                      opacity: 0.8
                    }}
                  >
                    Hike Completed
                  </button>
                ) : isJoined ? (
                  <button 
                    onClick={handleLeave} 
                    className="btn-cancel" 
                    style={{ background: '#fff', border: '1px solid #e53e3e', color: '#e53e3e', width: '100%', padding: '8px 12px', borderRadius: 8 }}
                  >
                    Leave Hike
                  </button>
                ) : (
                  <button 
                    onClick={handleJoin} 
                    className="btn-primary" 
                    style={{ background: '#2d6a4f', color: '#fff', width: '100%', padding: '8px 12px', borderRadius: 8 }}
                  >
                    Join Hike
                  </button>
                )}
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, background: '#e6eef0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2d6a4f' }}>
                  {hike.guide?.user?.name ? hike.guide.user.name.charAt(0).toUpperCase() : (hike.guideName ? hike.guideName.charAt(0) : 'G')}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{hike.guide?.user?.name || hike.guideName || 'Guide'}</div>
                  <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{hike.guide?.averageRating ? `${hike.guide.averageRating} ★` : ''} {hike.guide?.totalReviews ? `(${hike.guide.totalReviews} reviews)` : ''}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: '#444' }}>
                {hike.guide?.bio || 'Professional guide. No bio provided.'}
              </div>

              <div style={{ marginTop: 12 }}>
                <button onClick={() => {
                  if (!user) {
                    window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
                    return;
                  }
                  const guideId = hike.guide?.id || null;
                  navigate('/profile/guide', { state: { guideId, guideName: hike.guide?.user?.name, guidePhoto: hike.guide?.user?.photoUrl } });
                }} className="btn-primary" style={{ width: '100%', background: '#fff', color: '#2d6a4f', border: '1px solid #e5e7eb' }}>
                  View Profile
                </button>
              </div>
            </div>

            {/* Meeting Details Section */}
            <div style={{ marginTop: 12, background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
              <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Meeting Details</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Meeting Place</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{hike.meetingPlace || 'Not specified'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Date</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{date ? d.toLocaleDateString() : 'Not specified'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Time</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {hike.meetingTime ? (() => {
                      // Format time if it's in HH:MM format
                      const time = hike.meetingTime;
                      if (time.includes(':')) {
                        const [hours, minutes] = time.split(':');
                        const hour = parseInt(hours);
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHour = hour % 12 || 12;
                        return `${displayHour}:${minutes} ${ampm}`;
                      }
                      return time;
                    })() : 'Not specified'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Distance</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{hike.distance || 'Not specified'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Duration</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {hike.isMultiDay && hike.durationDays 
                      ? `${hike.durationDays} Day${hike.durationDays !== 1 ? 's' : ''}`
                      : (hike.duration || 'Not specified')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Elevation Gain</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{hike.elevationGain || 'Not specified'}</div>
                </div>
              </div>
            </div>
            
            {/* Review Section - Show for users who participated in this hike and it's past and not the creator */}
            {(isJoined || isParticipant) && isPast && !isCreator && (
              <div style={{ marginTop: 12 }}>
                <ReviewCard
                  hikeId={hike.id}
                  guideId={hike.guide?.id}
                  guideName={hike.guide?.user?.name || hike.guideName}
                  hasReviewed={hasReviewed}
                  onSubmitted={() => setHasReviewed(true)}
                />
              </div>
            )}

          </aside>
        </div>

        {/* Owner actions */}
        {isCreator && (
        <div style={{ marginTop: 24 }}>
          {!editMode ? (
            <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  className="btn-cancel" 
                  style={{ 
                    borderColor: isPast ? '#d1d5db' : '#2d6a4f', 
                    color: isPast ? '#9ca3af' : '#2d6a4f',
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    opacity: isPast ? 0.6 : 1
                  }} 
                  onClick={() => !isPast && setEditMode(true)}
                  disabled={isPast}
                  title={isPast ? 'Cannot edit past hikes' : 'Edit this hike'}
                >
                Edit Hike
              </button>
                <button 
                  className="btn-cancel" 
                  style={{ 
                    borderColor: '#e53e3e', 
                    color: '#e53e3e',
                    cursor: 'pointer'
                  }} 
                  onClick={handleDelete} 
                  disabled={deleting}
                  title={isPast ? 'Delete this past hike' : 'Delete this hike'}
                >
                {deleting ? 'Deleting…' : 'Delete Hike'}
              </button>
            </div>
          ) : (
              <EditHikeForm
                hike={hike}
                onSave={async () => {
                  console.log('[HikeDetails] EditForm onSave called, loading updated hike data...');
                  try {
                    // Wait for data to load, then close edit form
                    await load();
                    console.log('[HikeDetails] Hike data reloaded, closing edit form');
                    setEditMode(false);
                  } catch (err) {
                    console.error('[HikeDetails] Failed to reload hike data:', err);
                  }
                }}
                onCancel={() => {
                  console.log('[HikeDetails] Edit cancelled');
                  setEditMode(false);
                }}
                onDelete={handleDelete}
                deleting={deleting}
              />
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11000,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>⚠️</div>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: '#0f172a'
              }}>Delete Hike?</h3>
            </div>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '15px',
              color: '#64748b',
              lineHeight: '1.6'
            }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>"{hike?.title}"</strong>? 
              This will remove all participants from this hike. Reviews will be preserved.
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.background = '#fff'}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => !deleting && (e.target.style.background = '#b91c1c')}
                onMouseLeave={(e) => !deleting && (e.target.style.background = '#dc2626')}
              >
                {deleting ? 'Deleting...' : 'Delete Hike'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
