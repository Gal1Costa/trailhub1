import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Gauge, Info } from 'lucide-react';
import './TrailDetails.css';

export default function TrailDetails({ value, onChange, errors = {}, onManualEdit, manuallyEdited = { distance: false, duration: false }, isMultiDay = false, onEnableMultiDay }) {
  const update = (k) => (e) => {
    // Clear auto-calculated flag when user manually edits
    const newValue = { ...value, [k]: e.target.value, [`_${k}AutoCalculated`]: false };
    onChange(newValue);
  };
  const updateNumber = (k) => (e) => {
    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
    // Clear auto-calculated flag when user manually edits
    const newValue = { ...value, [k]: isNaN(val) ? '' : val, [`_${k}AutoCalculated`]: false };
    onChange(newValue);
    // Track manual edit
    if (onManualEdit && (k === 'distance' || k === 'durationHours' || k === 'durationDays')) {
      onManualEdit(k === 'durationHours' || k === 'durationDays' ? 'duration' : k);
    }
  };
  const updateDaysNumber = (k) => (e) => {
    const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
    const newValue = { ...value, [k]: isNaN(val) ? '' : val };
    onChange(newValue);
    if (onManualEdit) {
      onManualEdit('duration');
    }
  };
  const updateCheckbox = (k) => (e) => {
    const checked = e.target.checked;
    const updates = { ...value, [k]: checked };
    // When switching modes, clear the opposite duration field
    if (k === 'isMultiDay') {
      if (checked) {
        // Switching to multi-day: clear hours, set default days
        updates.durationHours = '';
        updates._durationHoursAutoCalculated = false;
        if (!value.durationDays) {
          updates.durationDays = 2;
        }
      } else {
        // Switching to single-day: clear days
        updates.durationDays = '';
      }
    }
    onChange(updates);
  };
  const getError = (field) => errors[field];
  
  // Get current distance value
  const currentDistance = typeof value.distance === 'number' ? value.distance : (value.distance ? parseFloat(value.distance) : 0);
  
  // Calculate suggested days based on distance
  const calculateSuggestedDays = (distance) => {
    if (distance <= 15) return 1;
    if (distance <= 25) return 2;
    if (distance <= 40) return 3;
    if (distance <= 60) return 4;
    return Math.ceil(distance / 15); // 15km per day average
  };
  
  const suggestedDays = useMemo(() => {
    if (currentDistance <= 0) return null;
    return calculateSuggestedDays(currentDistance);
  }, [currentDistance]);
  
  const showDaySplitSuggestion = currentDistance > 20 && !isMultiDay;
  
  // Check if duration is auto-calculated (for single-day)
  const isDurationHoursAutoCalculated = value._durationHoursAutoCalculated === true;
  
  // Get duration values
  const durationHours = value.durationHours !== undefined ? value.durationHours : value.duration;
  const durationDays = value.durationDays;
  
  // Determine if multi-day (from value or prop)
  const actualIsMultiDay = value.isMultiDay === true || isMultiDay;

  // Tooltip component
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

    // Handle keyboard navigation
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
    <div className="trail-details-container">
      <h2 className="trail-details-title">Trail Details</h2>
      
      {/* 1. Distance & Duration - Grid 2 columns */}
      <div className="distance-duration-row">
        {/* Distance */}
        <div className="field-error-container">
          <label>
            <div className="label-with-tooltip">
              <span className="label-text">Distance</span>
              <TooltipIcon text="Total trail distance in kilometers. Range: 0 – 1000 km." />
            </div>
            <input 
              type="number" 
              step="0.1"
              min="0"
              max="1000"
              value={typeof value.distance === 'number' ? value.distance : (value.distance || '')} 
              onChange={updateNumber('distance')} 
              placeholder="10.5"
              className={`input-base ${getError('distance') ? 'has-error' : ''}`}
            />
          </label>
          {getError('distance') && <span className="field-error">{getError('distance')}</span>}
        </div>
        
        {/* Duration - Dynamic based on multi-day */}
        <div className="field-error-container">
          <label>
            {!actualIsMultiDay ? (
              // Single-day: Show hours
              <>
                <div className="label-with-reset">
                  <div className="label-with-tooltip">
                    <span className="label-text">Estimated Hiking Time</span>
                    <TooltipIcon text="Range: 0 – 24 hours. auto-calculated from distance if left empty." />
                  </div>
                  <div className="label-right-group">
                    <input
                      type="checkbox"
                      checked={value.isMultiDay === true || isMultiDay}
                      onChange={updateCheckbox('isMultiDay')}
                      className="inline-checkbox-input"
                      title="Multi-day hike"
                    />
                  </div>
                </div>
                <input 
                  type="number" 
                  step="0.5"
                  min="0"
                  max="24"
                  value={typeof durationHours === 'number' ? durationHours : (durationHours || '')} 
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    const newValue = { ...value, durationHours: isNaN(val) ? '' : val, duration: isNaN(val) ? '' : val, _durationHoursAutoCalculated: false };
                    onChange(newValue);
                    if (onManualEdit) onManualEdit('duration');
                  }}
                  placeholder="4-5"
                  className={`input-base duration-input ${isDurationHoursAutoCalculated && !manuallyEdited.duration ? 'bg-gray-50' : ''} ${getError('duration') || getError('durationHours') ? 'has-error' : ''}`}
                />
                {isDurationHoursAutoCalculated && !manuallyEdited.duration && (
                  <small className="duration-help-text">Auto-calculated from distance</small>
                )}
                {showDaySplitSuggestion && !actualIsMultiDay && (
                  <div className="elegant-suggestion">
                    <span className="elegant-suggestion-icon">↠</span>
                    <span className="elegant-suggestion-text">Consider a multi-day hike</span>
                  </div>
                )}
              </>
            ) : (
              // Multi-day: Show days
              <>
                <div className="label-with-reset">
                  <div className="label-with-tooltip">
                    <span className="label-text">Number of Days</span>
                    <TooltipIcon text="Range: 2–14 days. Required when multi-day is enabled." />
                  </div>
                  <div className="label-right-group">
                    <input
                      type="checkbox"
                      checked={value.isMultiDay === true || isMultiDay}
                      onChange={updateCheckbox('isMultiDay')}
                      className="inline-checkbox-input"
                      title="Multi-day hike"
                    />
                  </div>
                </div>
                <div className="days-input-wrapper">
                  <input 
                    type="number" 
                    min="2"
                    max="14"
                    value={durationDays || ''} 
                    onChange={updateDaysNumber('durationDays')} 
                    placeholder="2"
                    className={`input-base ${getError('duration') || getError('durationDays') ? 'has-error' : ''}`}
                  />
                  
                </div>
              </>
            )}
          </label>
          {(getError('duration') || getError('durationHours') || getError('durationDays')) && (
            <span className="field-error">{getError('duration') || getError('durationHours') || getError('durationDays')}</span>
          )}
        </div>
      </div>

      {/* 2. Elevation Gain - Full width */}
      <div className="field-error-container elevation-field">
        <label>
          <div className="label-with-tooltip">
            <span className="label-text">Elevation Gain </span>
            <TooltipIcon text="Total elevation gain in meters. Range: 0 – 10,000 meters." />
          </div>
          <div className="input-wrapper">
            <Gauge className="input-icon input-icon-optional" size={16} />
            <input 
              type="number" 
              min="0"
              max="10000"
              value={typeof value.elevationGain === 'number' ? value.elevationGain : (value.elevationGain || '')} 
              onChange={updateNumber('elevationGain')} 
              placeholder="500"
              className={`input-base input-with-icon ${getError('elevationGain') ? 'has-error' : ''}`}
            />
          </div>
        </label>
        {getError('elevationGain') && <span className="field-error">{getError('elevationGain')}</span>}
      </div>

      {/* 3. Description - Full width */}
      <div className="field-error-container">
        <label>
          <div className="label-with-tooltip">
            <span className="label-text">Description</span>
            <TooltipIcon text="Up to 5000 characters. Describe scenery, difficulty, highlights." />
          </div>
          <textarea 
            value={value.description || ''} 
            onChange={update('description')} 
            placeholder="Describe the trail experience, scenery, highlights..."
            rows={5}
            className={`textarea-base ${getError('description') ? 'has-error' : ''}`}
          />
        </label>
        {getError('description') && <span className="field-error">{getError('description')}</span>}
      </div>
    </div>
  );
}