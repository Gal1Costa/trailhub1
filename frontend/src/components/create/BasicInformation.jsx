import React, { useState, useRef, useEffect } from 'react';
import { Mountain, Calendar, Clock, MapPin, Users, DollarSign, TrendingUp, ChevronDown, Check, Info } from 'lucide-react';
import './BasicInformation.css';

export default function BasicInformation({ value, onChange, errors = {} }) {
  const update = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const updateNumber = (k) => (e) => {
    const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    onChange({ ...value, [k]: isNaN(val) ? '' : val });
  };
  const getError = (field) => errors[field];

  // Difficulty dropdown state
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);
  const difficultyDropdownRef = useRef(null);
  
  // Refs for date and time inputs
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const difficultyOptions = [
    { value: 'EASY', label: 'Easy' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'HARD', label: 'Hard' }
  ];

  const getDifficultyLabel = () => {
    const difficulty = value.difficulty || 'EASY'; // Default to EASY
    const option = difficultyOptions.find(opt => opt.value === difficulty);
    return option ? option.label : 'Easy';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (difficultyDropdownRef.current && !difficultyDropdownRef.current.contains(event.target)) {
        setIsDifficultyOpen(false);
      }
    };

    if (isDifficultyOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDifficultyOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDifficultyOpen) {
        setIsDifficultyOpen(false);
      }
    };
    if (isDifficultyOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDifficultyOpen]);

  // Set default difficulty to EASY if not set (only on mount)
  useEffect(() => {
    if (!value.difficulty || value.difficulty === '') {
      onChange({ ...value, difficulty: 'EASY' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleDifficultySelect = (optionValue) => {
    onChange({ ...value, difficulty: optionValue });
    setIsDifficultyOpen(false);
  };

  const handleIconClick = (e, inputRef) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!inputRef.current) return;
    
    // Small delay to ensure the input is ready
    setTimeout(() => {
      if (inputRef.current) {
        // Try modern showPicker API first (works in Chrome 99+, Edge 99+)
        if (inputRef.current.showPicker && typeof inputRef.current.showPicker === 'function') {
          try {
            inputRef.current.showPicker();
          } catch (err) {
            // Fallback: trigger a click on the input element
            inputRef.current.click();
          }
        } else {
          // Fallback for older browsers: simulate a click on the input
          inputRef.current.click();
        }
      }
    }, 10);
  };

  // Tooltip component (same as TrailDetails)
  const TooltipIcon = ({ text }) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);
    const tooltipRef = useRef(null);

    const showTooltip = () => {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 300);
    };

    const hideTooltip = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(false);
    };

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && isVisible) {
          hideTooltip();
        }
      };
      if (isVisible) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [isVisible]);

    return (
      <div
        className="tooltip-trigger"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        tabIndex={0}
        role="button"
        aria-label={`Information: ${text}`}
      >
        <Info className="info-icon" size={14} />
        {isVisible && (
          <div className="info-tooltip" ref={tooltipRef}>
            <div className="tooltip-content">{text}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="basic-info-container">
      <h2 className="basic-info-title">Basic Information</h2>

      {/* 1. Hike Name - Full width, Required */}
      <div className="field-error-container">
        <label>
          <span className="label-text">
            Hike Name <span className="required-asterisk">*</span>
          </span>
          <div className="input-wrapper">
            <Mountain className="input-icon input-icon-required" size={16} />
            <input
              type="text"
              value={value.name || ''}
              onChange={update('name')}
              placeholder="e.g., Sunrise Peak Adventure"
              className={`input-base input-with-icon ${getError('name') ? 'has-error' : ''}`}
            />
          </div>
        </label>
        {getError('name') && <span className="field-error">{getError('name')}</span>}
      </div>


      {/* 2. Date & Meeting Time - Grid 2 columns, Both Required */}
      <div className="grid-row">
        <div className="field-error-container">
          <label>
            <div className="label-with-tooltip">
              <span className="label-text">
                {value.isMultiDay === true ? 'Start Date' : 'Date'} <span className="required-asterisk">*</span>
              </span>
              <TooltipIcon text="Click 📅 to pick a date" />
            </div>
            <div className="input-wrapper">
              <Calendar 
                className="input-icon input-icon-required input-icon-clickable" 
                size={16}
                onClick={(e) => handleIconClick(e, dateInputRef)}
              />
              <input
                type="date"
                ref={dateInputRef}
                value={value.date || ''}
                onChange={update('date')}
                className={`input-base input-with-icon ${getError('date') ? 'has-error' : ''}`}
              />
            </div>
          </label>
          {getError('date') && <span className="field-error">{getError('date')}</span>}
        </div>

        <div className="field-error-container">
          <label>
            <div className="label-with-tooltip">
              <span className="label-text">
                Meeting Time <span className="required-asterisk">*</span>
              </span>
              <TooltipIcon text="Click 🕐 to pick a time" />
            </div>
            <div className="input-wrapper">
              <Clock 
                className="input-icon input-icon-required input-icon-clickable" 
                size={16}
                onClick={(e) => handleIconClick(e, timeInputRef)}
              />
              <input
                type="time"
                ref={timeInputRef}
                value={value.meetingTime || ''}
                onChange={update('meetingTime')}
                className={`input-base input-with-icon ${getError('meetingTime') ? 'has-error' : ''}`}
              />
            </div>
          </label>
          {getError('meetingTime') && <span className="field-error">{getError('meetingTime')}</span>}
        </div>
      </div>

      {/* 3. Meeting Place - Full width, Required */}
      <div className="field-error-container">
        <label>
          <span className="label-text">
            Meeting Place <span className="required-asterisk">*</span>
          </span>
          <div className="input-wrapper">
            <MapPin className="input-icon input-icon-required" size={16} />
            <input
              type="text"
              value={value.meetingPlace || ''}
              onChange={update('meetingPlace')}
              placeholder="e.g., Main parking lot at trailhead"
              className={`input-base input-with-icon ${getError('meetingPlace') ? 'has-error' : ''}`}
            />
          </div>
        </label>
        {getError('meetingPlace') && <span className="field-error">{getError('meetingPlace')}</span>}
      </div>

      {/* 4. Location & Capacity - Grid 2 columns, Both Optional */}
      <div className="grid-row">
        <div className="field-error-container">
          <label>
            <span className="label-text">Location</span>
            <div className="input-wrapper">
              <MapPin className="input-icon input-icon-optional" size={16} />
              <input
                type="text"
                value={value.location || ''}
                onChange={update('location')}
                placeholder="e.g., Kazbegi, Georgia"
                className={`input-base input-with-icon ${getError('location') ? 'has-error' : ''}`}
              />
            </div>
          </label>
          {getError('location') && <span className="field-error">{getError('location')}</span>}
        </div>

        <div className="field-error-container">
          <label>
            <span className="label-text">Capacity <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>*</span></span>
            <div className="input-wrapper">
              <Users className="input-icon" size={16} />
              <input
                type="number"
                min="1"
                max="500"
                value={value.capacity || ''}
                onChange={update('capacity')}
                placeholder="e.g., 30"
                className={`input-base input-with-icon ${getError('capacity') ? 'has-error' : ''}`}
              />
            </div>
          </label>
          {getError('capacity') && <span className="field-error">{getError('capacity')}</span>}
        </div>
      </div>


      {/* 5. Price & Difficulty - Grid 2 columns, Both Optional */}
      <div className="grid-row">
        <div className="field-error-container">
          <label>
            <span className="label-text">Price</span>
            <div className="input-wrapper">
              <DollarSign className="input-icon input-icon-optional" size={16} />
              <input
                type="number"
                min="0"
                value={value.price || ''}
                onChange={update('price')}
                placeholder="e.g., 0"
                className={`input-base input-with-icon ${getError('price') ? 'has-error' : ''}`}
              />
            </div>
          </label>
          {getError('price') && <span className="field-error">{getError('price')}</span>}
        </div>

        <div className="field-error-container">
          <label>
            <span className="label-text">Difficulty Level</span>
            <div className="input-wrapper" ref={difficultyDropdownRef}>
              <TrendingUp className="input-icon input-icon-optional" size={16} />
              <div className="difficulty-dropdown-container">
                <button
                  type="button"
                  className={`difficulty-trigger ${isDifficultyOpen ? 'open' : ''} ${getError('difficulty') ? 'has-error' : ''}`}
                  onClick={() => setIsDifficultyOpen(!isDifficultyOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsDifficultyOpen(!isDifficultyOpen);
                    }
                  }}
                  aria-expanded={isDifficultyOpen}
                  aria-haspopup="listbox"
                  aria-label="Select difficulty level"
                >
                  <span className="difficulty-trigger-label">{getDifficultyLabel()}</span>
                  <ChevronDown className={`difficulty-arrow ${isDifficultyOpen ? 'open' : ''}`} size={16} />
                </button>
                {isDifficultyOpen && (
                  <div className="difficulty-dropdown" role="listbox">
                    {difficultyOptions.map((option) => {
                      const currentDifficulty = value.difficulty || 'EASY'; // Default to EASY
                      const isActive = currentDifficulty === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`difficulty-option ${isActive ? 'active' : ''}`}
                          onClick={() => handleDifficultySelect(option.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleDifficultySelect(option.value);
                            } else if (e.key === 'Escape') {
                              setIsDifficultyOpen(false);
                            }
                          }}
                          aria-selected={isActive}
                          role="option"
                        >
                          <span className="difficulty-option-label">{option.label}</span>
                          {isActive && (
                            <Check className="difficulty-check" size={16} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </label>
          {getError('difficulty') && <span className="field-error">{getError('difficulty')}</span>}
        </div>
      </div>
    </div>
  );
}