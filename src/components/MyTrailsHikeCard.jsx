import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MyTrailsHikeCard.css';

export default function MyTrailsHikeCard({ hike }) {
  const navigate = useNavigate();

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

  return (
    <div className="mytrails-hike-card">
      <div className="mytrails-hike-image-container">
        {hike.coverUrl && (
          <img src={hike.coverUrl} alt={hike.title} className="mytrails-hike-image" />
        )}
        <div className="mytrails-hike-overlay">
          <div className="mytrails-hike-badge">
            <span className="mytrails-badge-text">{getDaysUntilEvent(hike.date)}</span>
          </div>

          <div className="mytrails-hike-content">
            <h3 className="mytrails-hike-title">{hike.title}</h3>
            <div className="mytrails-hike-details">
              <span className="mytrails-detail-item">📅 {new Date(hike.date).toLocaleDateString()}</span>
              <span className="mytrails-detail-item">📍 {hike.location}</span>
            </div>
            <button
              onClick={() => navigate(`/hikes/${hike.id}`)}
              className="mytrails-view-details-btn"
            >
              VIEW DETAILS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
