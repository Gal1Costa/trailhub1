import React from "react";
import { Search } from "lucide-react";
import "./SearchBar.css";

export default function SearchBar({ value, onChange, onSearch }) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search hikes (title, location)"
          className="search-input"
        />
      </div>
    </div>
  );
}
