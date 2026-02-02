import React from "react";
import { MapPin, Calendar } from "lucide-react";
import TimeFilter from "./TimeFilter";
import "./FilterSection.css";

export default function FilterSection({
  locationValue,
  onLocationChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  priceFrom,
  onPriceFromChange,
  priceTo,
  onPriceToChange,
  difficultyValue,
  onDifficultyChange,
  activeFilter,
  onFilterChange,
  onClearFilters,
  onApplyFilters,
  isSidebar = false,
}) {
  const startRef = React.useRef(null);
  const endRef = React.useRef(null);

  const handleIconClick = (e, inputRef) => {
    e.preventDefault();
    e.stopPropagation();

    if (!inputRef.current) return;

    setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      if (typeof el.showPicker === "function") {
        try {
          el.showPicker();
          return;
        } catch (err) {
          // fallthrough to click
        }
      }
      el.click();
    }, 10);
  };
  const difficultyOptions = [
    { value: "all", label: "all" },
    { value: "easy", label: "Easy" },
    { value: "moderate", label: "Moderate" },
    { value: "hard", label: "Hard" },
  ];

  // Normalize difficultyValue to array (handle backward compatibility)
  const currentValues = Array.isArray(difficultyValue) 
    ? difficultyValue 
    : (difficultyValue ? [difficultyValue] : []);

  // Handler for difficulty selection (multi-select checkboxes)
  const handleDifficultyChange = (value) => {
    if (value === "all") {
      // "(all)" checkbox - special behavior
      if (currentValues.includes("all") || currentValues.length === 0) {
        // Deselect all (including "all")
        onDifficultyChange([]);
      } else {
        // Select "all" (means all difficulties)
        onDifficultyChange(["all"]);
      }
    } else {
      // Regular difficulty (easy, moderate, hard)
      const withoutAll = currentValues.filter(v => v !== "all");
      
      if (withoutAll.includes(value)) {
        // Remove from selection
        const newValues = withoutAll.filter(v => v !== value);
        onDifficultyChange(newValues);
      } else {
        // Add to selection
        onDifficultyChange([...withoutAll, value]);
      }
    }
  };

  // Check if checkbox should be checked
  const isChecked = (optionValue) => {
    if (optionValue === "all") {
      // "all" is checked if it's in the array OR if array is empty
      return currentValues.includes("all") || currentValues.length === 0;
    }
    // Regular difficulty is checked if in array (and "all" is not selected)
    return currentValues.includes(optionValue) && !currentValues.includes("all");
  };

  return (
    <div className="filter-section">
      <div className="filter-header">
        <h3 className="filter-title">Filters</h3>
      </div>

      <div className="filter-content">
        {/* Location */}
        <div className="filter-group">
          <label className="filter-group-label">Location</label>
          <div className="location-input-wrapper">
            <MapPin className="location-icon" size={16} />
            <input
              type="text"
              value={locationValue}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="Kazbegi"
              className="filter-input location-input"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="filter-group">
          <label className="filter-group-label">Date Range</label>
          <div className="date-range-wrapper">
            <div className="date-input-wrapper">
              <Calendar
                className="date-icon"
                size={16}
                role="button"
                aria-label="Pick start date"
                tabIndex={0}
                onClick={(e) => handleIconClick(e, startRef)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleIconClick(e, startRef);
                  }
                }}
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="filter-input date-input"
                ref={startRef}
              />
            </div>
            <div className="date-input-wrapper">
              <Calendar
                className="date-icon"
                size={16}
                role="button"
                aria-label="Pick end date"
                tabIndex={0}
                onClick={(e) => handleIconClick(e, endRef)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleIconClick(e, endRef);
                  }
                }}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="filter-input date-input"
                ref={endRef}
              />
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div className="filter-group">
          <label className="filter-group-label">Price Range</label>
          <div className="price-range-wrapper">
            <input
              type="number"
              min="0"
              value={priceFrom}
              onChange={(e) => onPriceFromChange(e.target.value)}
              placeholder="0"
              className="filter-input price-input"
            />
            <span className="price-arrow">→</span>
            <input
              type="number"
              min="0"
              value={priceTo}
              onChange={(e) => onPriceToChange(e.target.value)}
              placeholder="100"
              className="filter-input price-input"
            />
          </div>
        </div>

        {/* Time Period */}
        <div className="filter-group">
          <label className="filter-group-label">Time Period</label>
          <TimeFilter activeFilter={activeFilter} onFilterChange={onFilterChange} />
        </div>

        {/* Difficulty */}
        <div className="filter-group">
          <label className="filter-group-label">Difficulty Level</label>
          <div className="difficulty-checkboxes">
            {difficultyOptions.map((option) => (
              <label key={option.value} className="difficulty-checkbox">
                <input
                  type="checkbox"
                  checked={isChecked(option.value)}
                  onChange={() => handleDifficultyChange(option.value)}
                  className="checkbox-input"
                />
                <span className="checkbox-label">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="filter-actions">
          <button onClick={onClearFilters} className="btn-cancel filter-action-btn">
            Clear
          </button>
          <button onClick={onApplyFilters} className="btn-primary filter-action-btn">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
