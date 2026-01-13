import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import api from '../api';
import './HikeCard.css';

export default function HikeCard({
  hike,
  isJoined = false,
  onJoin,
  onLeave,
  allowJoin = true,
  allowLeave = true,
  userProfile = null,
  fromProfile = false,
  needsReview = false,
}) {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const date = hike.date || hike.startDate || hike.createdAt;
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

  // Calculate actual participants count excluding deleted users
  const activeParticipantsCount = useMemo(() => {
    if (hike.participants && Array.isArray(hike.participants)) {
      return hike.participants.filter(p => p && p.name !== 'Deleted User').length;
    }
    return hike.participantsCount ?? 0;
  }, [hike.participants, hike.participantsCount]);

  const participantsCount = activeParticipantsCount;
  const capacity = hike.capacity ?? 0;
  const isFull = hike.isFull || (capacity > 0 && participantsCount >= capacity);
  
  // Get guide/admin name - handle various data structures
  const guideName = hike.guideName || 
                    hike.guide?.user?.name || 
                    hike.guide?.displayName || 
                    hike.guide?.name || 
                    null;
  
  // Format capacity display
  const formatCapacity = () => {
    if (capacity === 0 || capacity === null || capacity === undefined) {
      return `${participantsCount} joined`;
    }
    return `${participantsCount} / ${capacity}`;
  };

  const isCreator = userProfile && (
    (userProfile.role === 'guide' && userProfile.createdHikes?.some(ch => ch.id === hike.id)) ||
    (hike.guideId && userProfile.guide?.id === hike.guideId)
  );

  // Extract number of days from duration
  const getHikeType = () => {
    // First check if hike has isMultiDay and durationDays
    if (hike.isMultiDay && hike.durationDays) {
      const days = hike.durationDays;
      return `${days} Day${days !== 1 ? 's' : ''}`;
    }
    
    // Then check if hike has durationDays (multi-day hikes)
    if (hike.durationDays) {
      const days = hike.durationDays;
      return `${days} Day${days !== 1 ? 's' : ''}`;
    }
    
    // Try to extract number from duration string (e.g., "3 days" -> "3 Days")
    const duration = hike.duration || '';
    
    // Check for "X days" or "X day" format
    const daysMatch = duration.match(/^(\d+)\s*days?/i);
    if (daysMatch) {
      const days = daysMatch[1];
      return `${days} Day${days !== '1' ? 's' : ''}`;
    }
    
    // Check for "X hours" format - if more than 8 hours, show as partial day
    const hoursMatch = duration.match(/^(\d+(?:\.\d+)?)\s*hours?/i);
    if (hoursMatch) {
      const hours = parseFloat(hoursMatch[1]);
      // If it's a reasonable day-hike duration, just show "1 Day"
      return '1 Day';
    }
    
    // Check if duration is just a number (hours)
    const numDuration = parseFloat(duration);
    if (!isNaN(numDuration) && numDuration > 0) {
      // If it looks like hours, just show "1 Day"
      return '1 Day';
    }
    
    // Default to "1 Day" for single day hikes if no duration specified
    return '1 Day';
  };

  // Decide button state
  let buttonLabel = '';
  let disabled = true;
  let buttonAction = null;
  let btnClass = '';

  if (isPast) {
    buttonLabel = 'Past';
    disabled = true;
    btnClass = 'past';
  } else if (isCreator) {
    buttonLabel = 'Your Hike';
    disabled = true;
    btnClass = 'your-hike';
  } else if (isJoined) {
    if (allowLeave) {
      buttonLabel = 'Leave';
      disabled = false;
      buttonAction = onLeave;
      btnClass = 'leave';
    } else {
      buttonLabel = 'Joined';
      disabled = true;
      btnClass = 'joined';
    }
  } else if (isFull) {
    buttonLabel = 'Full';
    disabled = true;
    btnClass = 'full';
  } else {
    if (allowJoin) {
      buttonLabel = 'Join';
      disabled = false;
      buttonAction = onJoin;
      btnClass = 'join';
    } else {
      buttonLabel = '';
    }
  }

  const difficulty = (hike.difficulty || 'moderate').toLowerCase();

  // Format hike cost/price
  const formatCost = (price) => {
    if (price === null || price === undefined || price === 0) {
      return 'Free';
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'Free';
    return numPrice % 1 === 0 ? `$${numPrice.toFixed(0)}` : `$${numPrice.toFixed(2)}`;
  };

  // Format difficulty for display
  const formatDifficulty = (diff) => {
    if (!diff) return 'Moderate';
    return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
  };

  // Get difficulty color class for badge
  const getDifficultyColorClass = () => {
    const diff = (hike.difficulty || 'moderate').toLowerCase();
    if (diff === 'easy') return 'difficulty-easy';
    if (diff === 'moderate') return 'difficulty-moderate';
    if (diff === 'hard') return 'difficulty-hard';
    return 'difficulty-moderate'; // default
  };

  function handleView(e) {
    navigate(`/hikes/${hike.id}`, { state: { fromProfile: !!fromProfile } });
  }

  return (
    <div className="hike-card">
      <div className="hike-image-container" onClick={handleView}>
        {hike.imageUrl ? (
          (() => {
            const src = hike.imageUrl && hike.imageUrl.startsWith('/') ? `${api.defaults.baseURL}${hike.imageUrl}` : hike.imageUrl;
            return <img src={src} alt={hike.title || hike.name} className="hike-image" />;
          })()
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #e0e0e0 0%, #f0f0f0 100%)' }} />
        )}
        {/* Type Badge */}
        <div className="hike-type-badge">{getHikeType()}</div>
        
        {/* Difficulty Indicator Badge - Top Right */}
        <div className={`difficulty-indicator ${getDifficultyColorClass()}`} title={`Difficulty: ${formatDifficulty(difficulty)}`}>
          <span className="difficulty-dot"></span>
          <span className="difficulty-text">{formatDifficulty(difficulty)}</span>
        </div>
        
        {needsReview && (
          <div className="review-indicator" title="Review pending">
            ✍️
          </div>
        )}
      </div>

      <div className="hike-content" onClick={handleView}>
        <h3 className="hike-title">{hike.name || hike.title || 'Untitled hike'}</h3>
        
        {/* Guide/Admin Name */}
        {guideName && (
          <div className="hike-guide">
            <span className="guide-icon">👤</span>
            {guideName}
          </div>
        )}
        
        <div className="hike-location">📍 {hike.location || 'Unknown location'}</div>
        
        {/* Single line: Date, Capacity, Price */}
        <div className="hike-details-line">
          {date && (
            <span className="detail-item">
              <span className="detail-icon">📅</span>
              {d && d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          <span className="detail-item capacity-item">
            <span className="detail-icon">👥</span>
            <span className={isFull ? 'capacity-full' : 'capacity-available'}>
              {formatCapacity()}
            </span>
            {isFull && <span className="capacity-badge-inline">Full</span>}
          </span>
          <span className="detail-item price">
            {formatCost(hike.price || hike.cost)}
          </span>
        </div>
      </div>

      <div className="hike-actions">
        <button className="view-details-btn" onClick={(e) => { e.stopPropagation(); handleView(); }}>
          View Details
        </button>
        {buttonLabel && (
          <button
            className={`join-btn ${btnClass}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled && typeof buttonAction === 'function') buttonAction(hike.id);
            }}
            disabled={disabled}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
