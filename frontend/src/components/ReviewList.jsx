import React, { useState, useEffect } from 'react';
import api from '../api';
import './ReviewList.css';

export default function ReviewList({ guideId, userId, hikeId, title = "Reviews" }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReviews();
  }, [guideId, userId, hikeId]);

  async function loadReviews() {
    setLoading(true);
    setError('');
    try {
      let endpoint = '';
      if (guideId) {
        endpoint = `/reviews/guide/${guideId}`;
      } else if (userId) {
        endpoint = `/reviews/user/me`;
      } else if (hikeId) {
        endpoint = `/reviews/hike/${hikeId}`;
      } else {
        // Don't show error if no ID provided - just return empty
        setReviews([]);
        setLoading(false);
        return;
      }

      const res = await api.get(endpoint);
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load reviews', e);
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to load reviews';
      setError(errorMsg);
      setReviews([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function renderStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  if (loading) return <div className="reviews-loading">Loading reviews...</div>;
  if (error) return <div className="reviews-error">Error: {error}</div>;

  return (
    <div className="reviews-section">
      <h3 className="reviews-title">{title}</h3>
      {reviews.length === 0 ? (
        <div className="reviews-empty">No reviews yet.</div>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <div className="review-user">
                  <div className="review-avatar">
                    {(review.user?.name || review.user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="review-user-info">
                    <div className="review-user-name">
                      {review.user?.name || review.user?.email || 'Anonymous'}
                    </div>
                    <div className="review-date">{formatDate(review.createdAt)}</div>
                  </div>
                </div>
                <div className="review-rating">
                  <span className="review-stars">{renderStars(review.rating)}</span>
                  <span className="review-rating-number">{review.rating}/5</span>
                </div>
              </div>

              {review.comment && (
                <div className="review-comment">{review.comment}</div>
              )}

              {review.tags && review.tags.length > 0 && (
                <div className="review-tags">
                  {review.tags.map((tag, idx) => (
                    <span key={idx} className="review-tag">{tag}</span>
                  ))}
                </div>
              )}

              {review.hike && (
                <div className="review-hike-info">
                  For hike: <strong>{review.hike.title}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}