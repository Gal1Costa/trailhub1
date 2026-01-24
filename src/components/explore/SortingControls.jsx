import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import "./SortingControls.css";

export default function SortingControls({ sortValue, onSortChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const sortOptions = [
    { value: "priceHigh", label: "Price: High to Low" },
    { value: "priceLow", label: "Price: Low to High" },
    { value: "soonest", label: "Soonest" },
    { value: "newest", label: "Newest" },
  ];
  
  const getCurrentLabel = () => {
    const option = sortOptions.find(opt => opt.value === sortValue);
    return option ? option.label : "Sort by";
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);
  
  const handleOptionClick = (value) => {
    onSortChange(value);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      // Return focus to trigger button
      if (dropdownRef.current) {
        const trigger = dropdownRef.current.querySelector('.sort-trigger');
        if (trigger) trigger.focus();
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleOptionKeyDown = (e, value) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOptionClick(value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      // Return focus to trigger button
      if (dropdownRef.current) {
        const trigger = dropdownRef.current.querySelector('.sort-trigger');
        if (trigger) trigger.focus();
      }
    }
  };
  
  return (
    <div className="sorting-container" ref={dropdownRef}>
      <button 
        className={`sort-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Sort hikes"
        type="button"
      >
        <span className="sort-trigger-label">{getCurrentLabel()}</span>
        <ChevronDown className={`sort-arrow ${isOpen ? "open" : ""}`} size={16} aria-hidden="true" />
      </button>
      
      {isOpen && (
        <div 
          className="sort-dropdown" 
          role="listbox"
          aria-label="Sort options"
        >
          {sortOptions.map((option) => {
            const isActive = option.value === sortValue;
            
            return (
              <button
                key={option.value}
                className={`sort-option ${isActive ? "active" : ""}`}
                onClick={() => handleOptionClick(option.value)}
                onKeyDown={(e) => handleOptionKeyDown(e, option.value)}
                aria-selected={isActive}
                role="option"
                type="button"
              >
                <span className="sort-option-label">{option.label}</span>
                {isActive && (
                  <span className="check-mark" aria-hidden="true">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
