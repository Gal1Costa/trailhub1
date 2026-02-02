import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, onAuthStateChanged } from "../firebase";
import api from '../api';
import MyTrailsHikeCard from '../components/MyTrailsHikeCard';
import './MyTrails.css';

export default function MyTrails() {
  const navigate = useNavigate();
  const [primaryHike, setPrimaryHike] = useState(null);
  const [otherHikes, setOtherHikes] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthReady(true);
  });
  return () => unsub();
}, []);

  // Fetch user's upcoming bookings/hikes
  useEffect(() => {
    const fetchMyTrails = async () => {
      try {
        setLoading(true);
        // Fetch user profile which includes bookings and created hikes
        const res = await api.get('/me');
        const profile = res.data || {};
        
        // Get joined bookings
        const bookings = Array.isArray(profile.bookings) ? profile.bookings : [];
        
        // Get created hikes (convert to booking-like structure)
        const createdHikes = Array.isArray(profile.createdHikes) ? profile.createdHikes : [];
        const createdBookings = createdHikes.map(hike => ({ hike, id: `created-${hike.id}` }));
        
        // Combine both joined and created hikes
        const allHikes = [...bookings, ...createdBookings];

        if (allHikes.length === 0) {
          setError('No upcoming hikes');
          setLoading(false);
          return;
        }

        // Sort by hike date and time, filter for future dates
        const now = new Date();
        const sorted = allHikes
          .filter(b => {
            if (!b.hike || !b.hike.date) return false;
            const hikeDateTime = parseHikeDateTime(b.hike.date, b.hike.meetingTime);
            return hikeDateTime > now;
          })
          .sort((a, b) => {
            const hikeADateTime = parseHikeDateTime(a.hike.date, a.hike.meetingTime);
            const hikeBDateTime = parseHikeDateTime(b.hike.date, b.hike.meetingTime);
            return hikeADateTime - hikeBDateTime;
          });

        if (sorted.length > 0) {
          const primaryBooking = sorted[0];
          const primaryHikeData = primaryBooking.hike;
          setPrimaryHike(primaryHikeData);

          // Filter other hikes to only show hikes in the current month
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          const hikesThisMonth = sorted.slice(1).filter(b => {
            const hikeDate = new Date(b.hike.date);
            return hikeDate.getMonth() === currentMonth && hikeDate.getFullYear() === currentYear;
          });

          setOtherHikes(hikesThisMonth);

          // Extract checklist from primary hike details
          if (primaryHikeData.whatToBring) {
            const items = primaryHikeData.whatToBring.split('\n').filter(item => item.trim());
            const itemsArray = items.map((item, idx) => ({
              id: idx,
              text: item.trim(),
            }));
            setChecklist(itemsArray);
            
            // Load checklist state from localStorage
            const savedChecklistState = localStorage.getItem(`checklist-${primaryHikeData.id}`);
            if (savedChecklistState) {
              setCheckedItems(JSON.parse(savedChecklistState));
            }
          }
          setError(null);
        } else {
          setError('No upcoming hikes');
        }
      } catch (err) {
        console.error('Failed to fetch my trails:', err);
        setError('Failed to load hikes: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };
    if (!authReady || !user) return;
    fetchMyTrails();
  }, [authReady, user]);

  // Toggle checklist item and save to localStorage
  const toggleChecklistItem = (id) => {
    const updatedChecklist = {
      ...checkedItems,
      [id]: !checkedItems[id],
    };
    setCheckedItems(updatedChecklist);
    // Save to localStorage
    if (primaryHike) {
      localStorage.setItem(`checklist-${primaryHike.id}`, JSON.stringify(updatedChecklist));
    }
  };

  const progressCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? (progressCount / totalCount) * 100 : 0;

  // Helper function to parse date and time into a single DateTime
  const parseHikeDateTime = (dateStr, timeStr) => {
    const date = new Date(dateStr);
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        date.setHours(hours, minutes, 0, 0);
      }
    }
    return date;
  };

  // Helper function to calculate days until event

  const getDaysUntilEvent = (eventDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    const timeDiff = event - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff === 0) return 'TODAY';
    if (daysDiff === 1) return 'TOMORROW';
    return `IN ${daysDiff} DAYS`;
  };

  if (loading) {
    return (
      <div className="mytrails-container">
        <div className="mytrails-loader">Loading your trails...</div>
      </div>
    );
  }

  if (error || !primaryHike) {
    return (
      <div className="mytrails-container">
        <div className="mytrails-error">
          <h1>My Trails</h1>
          <p>{error || 'No upcoming hikes. Explore and join some trails!'}</p>
          <button onClick={() => navigate('/explore')} className="btn-explore">
            Explore Hikes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mytrails-container">
      <h1 className="mytrails-title">My Trails</h1>
      <p className="mytrails-subtitle">Your upcoming adventures and trip preparations</p>

      {/* Primary Upcoming Hike Banner */}
      <div className="trail-card">
        <div className="trail-image-container">
          {primaryHike.coverUrl && (
            <img src={primaryHike.coverUrl} alt={primaryHike.title} className="trail-image" />
          )}
          <div className="trail-overlay">
            <div className="trail-badge">
              <span className="badge-text">{getDaysUntilEvent(primaryHike.date)}</span>
            </div>
            <div className="trail-content">
              <h2 className="trail-title">{primaryHike.title}</h2>
              <div className="trail-details">
                <span className="detail-item">📅 {new Date(primaryHike.date).toLocaleDateString()} • {primaryHike.meetingTime}</span>
                <span className="detail-item">📍 {primaryHike.location}</span>
                <span className="detail-item">👥 {primaryHike.capacity} participants</span>
              </div>
              <button
                onClick={() => navigate(`/hikes/${primaryHike.id}`)}
                className="view-details-btn"
              >
                VIEW DETAILS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prepare for Your Hike - Checklist */}
      {checklist.length > 0 && (
        <div className="checklist-section">
          <div className="checklist-header">
            <div>
              <h2 className="checklist-title">Prepare for your hike</h2>
              <p className="checklist-subtitle">Make sure you have everything you need</p>
            </div>
            <div className="progress-indicator">
              <div className="progress-text">{progressCount}/{totalCount}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Checklist Items Grid */}
          <div className="checklist-grid">
            {checklist.map(item => (
              <button
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={`checklist-item ${checkedItems[item.id] ? 'checked' : ''}`}
              >
                <span className="item-icon">
                  {checkedItems[item.id] ? '✓' : '○'}
                </span>
                <span className="item-text">{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* More Hikes This Month */}
      {otherHikes.length > 0 && (
        <div className="more-hikes-section">
          <h2 className="more-hikes-title">
            More events this month ({otherHikes.length})
          </h2>

          <div className="mytrails-horizontal-scroll">
            {otherHikes.map(booking => (
              <MyTrailsHikeCard key={booking.id} hike={booking.hike} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}