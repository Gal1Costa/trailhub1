import React from "react";
import "./TimeFilter.css";

export default function TimeFilter({ activeFilter, onFilterChange }) {
  return (
    <div className="time-filter">
      <button
        className={`time-btn ${activeFilter === "upcoming" ? "active" : ""}`}
        onClick={() => onFilterChange("upcoming")}
      >
        Upcoming
      </button>
      <button
        className={`time-btn ${activeFilter === "past" ? "active" : ""}`}
        onClick={() => onFilterChange("past")}
      >
        Past
      </button>
    </div>
  );
}
