import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardCard.css';

export default function DashboardCard({ title, value, to }) {
  const inner = (
    <div className="dashboard-card">
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
