import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardCard.css';

export default function DashboardCard({ title, value, to, highlight }) {
  const inner = (
    <div className={`dashboard-card ${highlight ? 'highlight' : ''}`}>
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="dashboard-card-link">
        {inner}
      </Link>
    );
  }

  return inner;
}
