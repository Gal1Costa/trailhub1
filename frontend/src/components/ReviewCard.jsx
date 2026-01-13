import React, { useState } from 'react';
import api from '../api';
import './ReviewCard.css';

export default function ReviewCard({ hikeId, guideId, guideName, onSubmitted, hasReviewed = false }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(hasReviewed);

  const quickTags = ['Friendly', 'Knowledgeable', 'Good pace', 'Great route', 'Safety-focused'];

  function toggleTag(t) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleSubmit() {
    if (!rating || submitting || submitted) return; // Prevent resubmission

    setSubmitting(true);
    try {
      // Always send tags as an array (never null)
      await api.post('/reviews', {
        hikeId,
        guideId,
        rating,
        comment: comment.trim() ? comment.trim() : null,
        tags: tags, // [] if none selected
      });

      setSubmitted(true);
      if (onSubmitted) {
        onSubmitted();
      }
    } catch (e) {
      console.error('Failed to submit review', e);
      alert(e?.response?.data?.error || e?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  // Show permanent success state if already reviewed
  if (submitted) {
    return (
      <div className="review-success-container">
        <div className="review-success-card">
          <div className="success-icon">✅</div>
          <div className="success-content">
            <h4 className="success-title">Review Submitted</h4>
            <p className="success-message">Thank you for your feedback! Your review helps other hikers choose the right guide.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-card-form">
      <h3 className="review-form-title">
        How was this hike with {guideName || 'the guide'}?
      </h3>

      <div className="review-rating-input">
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              className={`rating-star ${s <= rating ? 'active' : ''}`}
              onClick={() => setRating(s)}
              aria-label={`${s} star`}
            >
              ★
            </button>
          ))}
        </div>
        <span className="rating-display">{rating} / 5</span>
      </div>

      <textarea
        className="review-comment-input"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share what you liked..."
        rows={3}
      />

      <div className="review-tags-input">
        {quickTags.map((t) => (
          <button
            key={t}
            type="button"
            className={`tag-button ${tags.includes(t) ? 'active' : ''}`}
            onClick={() => toggleTag(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="review-submit"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
}