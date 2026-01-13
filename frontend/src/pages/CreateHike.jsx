import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BasicInformation from '../components/create/BasicInformation';
import TrailDetails from '../components/create/TrailDetails';
import MapRoute from '../components/create/MapRoute';
import WhatToBring from '../components/create/WhatToBring';
import CoverImage from '../components/create/CoverImage';
import { calculateRouteDistance, calculateRouteDuration } from '../utils/mapUtils.jsx';
import { validateHikeForm } from '../utils/hikeValidation.jsx';
import './CreateHike.css';

export default function CreateHike() {
  const navigate = useNavigate();
  const [basic, setBasic] = useState({});
  const [trail, setTrail] = useState({});
  const [route, setRoute] = useState({
    points: [],
    destinations: [],
    location: null,
    mapMode: 'simple'
  });
  const [cover, setCover] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [manuallyEdited, setManuallyEdited] = useState({ distance: false, duration: false });
  const manuallyEditedRef = useRef({ distance: false, duration: false });
  
  // Sync ref with state
  useEffect(() => {
    manuallyEditedRef.current = manuallyEdited;
  }, [manuallyEdited]);
  
  // Reset distance and duration when switching between route modes
  const prevMapModeRef = useRef(route.mapMode);
  useEffect(() => {
    if (prevMapModeRef.current && prevMapModeRef.current !== route.mapMode) {
      // Mode changed - reset distance and duration if they were auto-calculated
      setTrail(prev => {
        const updates = {};
        if (prev._distanceAutoCalculated) {
          updates.distance = '';
          updates._distanceAutoCalculated = false;
        }
        if (prev._durationHoursAutoCalculated || prev._durationAutoCalculated) {
          updates.durationHours = '';
          updates.duration = '';
          updates._durationHoursAutoCalculated = false;
          updates._durationAutoCalculated = false;
        }
        if (prev.durationDays) {
          updates.durationDays = '';
        }
        // Reset manual edit flags for distance/duration when mode changes
        setManuallyEdited(prevEdited => ({
          ...prevEdited,
          distance: false,
          duration: false
        }));
        manuallyEditedRef.current.distance = false;
        manuallyEditedRef.current.duration = false;
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
    prevMapModeRef.current = route.mapMode;
  }, [route.mapMode]);

  // Create a key to detect route changes reliably
  const routeChangeKey = useMemo(() => {
    if (route.mapMode === 'destinations') {
      return `dest-${route.destinations?.length || 0}-${JSON.stringify(route.destinations || [])}`;
    } else {
      return `points-${route.points?.length || 0}-${JSON.stringify(route.points || [])}`;
    }
  }, [route.points, route.destinations, route.mapMode]);
  
  // Auto-calculate distance and duration when route changes
  useEffect(() => {
    const mapMode = route.mapMode || 'simple';
    let routePoints = [];
    
    // Get route points based on mode
    if (mapMode === 'destinations') {
      // In destinations mode, use destinations array
      if (Array.isArray(route.destinations) && route.destinations.length >= 2) {
        routePoints = route.destinations
          .filter(d => d && d.lat != null && d.lng != null)
          .map(d => [d.lat, d.lng]);
      }
    } else {
      // In simple mode, use points array
      if (Array.isArray(route.points) && route.points.length >= 2) {
        // Validate points format - should be [lat, lng] arrays
        routePoints = route.points.filter(point => 
          Array.isArray(point) && 
          point.length >= 2 && 
          typeof point[0] === 'number' && 
          typeof point[1] === 'number' &&
          !isNaN(point[0]) && 
          !isNaN(point[1])
        );
      }
    }
    
    if (routePoints.length >= 2) {
      const distance = calculateRouteDistance(routePoints);
      // Elevation gain is already a number from the number input
      const elevationGain = typeof trail.elevationGain === 'number' 
        ? trail.elevationGain 
        : (trail.elevationGain ? Number(trail.elevationGain) : 0);
      const difficulty = basic.difficulty || 'MODERATE';

      // Update distance as numeric value (for number input)
      const numericDistance = distance > 0 ? parseFloat(distance.toFixed(1)) : null;

      // Calculate duration in hours (numeric value for number input)
      const durationHours = calculateRouteDuration(routePoints, elevationGain, difficulty);
      const numericDuration = durationHours > 0 ? parseFloat(durationHours.toFixed(1)) : null;

      // Auto-fill if user hasn't manually edited the fields
      // Update if field is empty OR if it was previously auto-calculated (route changed)
      const updates = {};
      const currentDistance = trail.distance;
      const isMultiDay = trail.isMultiDay === true || basic.isMultiDay === true;
      
      // Check if distance field is empty (null, undefined, or empty string - but NOT 0, as 0 is a valid value)
      const isDistanceEmpty = currentDistance === '' || currentDistance === null || currentDistance === undefined;
      const wasDistanceAutoCalculated = trail._distanceAutoCalculated === true;
      // Update if: (empty OR was auto-calculated) AND not manually edited AND we have a new value
      if ((isDistanceEmpty || wasDistanceAutoCalculated) && numericDistance !== null && !manuallyEditedRef.current.distance) {
        const newDistance = parseFloat(numericDistance.toFixed(1));
        // Only update if value would change
        if (currentDistance !== newDistance) {
          updates.distance = newDistance;
          updates._distanceAutoCalculated = true;
        }
      }
      
      // Duration handling: hours for single-day, days for multi-day
      if (!isMultiDay) {
        // Single-day: update durationHours
        const currentDurationHours = trail.durationHours !== undefined ? trail.durationHours : trail.duration;
        const isDurationHoursEmpty = currentDurationHours === '' || currentDurationHours === null || currentDurationHours === undefined;
        const wasDurationHoursAutoCalculated = trail._durationHoursAutoCalculated === true || trail._durationAutoCalculated === true;
        // Update if: (empty OR was auto-calculated) AND not manually edited AND we have a new value
        if ((isDurationHoursEmpty || wasDurationHoursAutoCalculated) && numericDuration !== null && !manuallyEditedRef.current.duration) {
          const newDurationHours = parseFloat(numericDuration.toFixed(1));
          // Only update if value would change
          if (currentDurationHours !== newDurationHours) {
            updates.durationHours = newDurationHours;
            updates.duration = newDurationHours; // Keep backward compatibility
            updates._durationHoursAutoCalculated = true;
            updates._durationAutoCalculated = true;
          }
        }
      } else {
        // Multi-day: suggest days based on distance (only if empty and not manually edited)
        const calculateSuggestedDays = (dist) => {
          if (dist <= 15) return 1;
          if (dist <= 25) return 2;
          if (dist <= 40) return 3;
          if (dist <= 60) return 4;
          return Math.ceil(dist / 15); // 15km per day average
        };
        
        const currentDurationDays = trail.durationDays;
        const isDurationDaysEmpty = currentDurationDays === '' || currentDurationDays === null || currentDurationDays === undefined;
        // Only suggest if empty and not manually edited
        if (isDurationDaysEmpty && numericDistance !== null && !manuallyEditedRef.current.duration) {
          const suggestedDays = calculateSuggestedDays(numericDistance);
          if (suggestedDays >= 2) {
            updates.durationDays = suggestedDays;
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        setTrail(prev => ({ ...prev, ...updates }));
      }
    }
  }, [routeChangeKey, trail.elevationGain, basic.difficulty, trail._distanceAutoCalculated, trail._durationHoursAutoCalculated, trail.isMultiDay, basic.isMultiDay]);
  
  // Handle manual edit tracking
  const handleManualEdit = (field) => {
    // Update ref immediately to prevent auto-calculation
    manuallyEditedRef.current[field] = true;
    setManuallyEdited(prev => ({ ...prev, [field]: true }));
  };
  

  async function handleCreate() {
    setErr(null);
    
    // Comprehensive validation
    const validation = validateHikeForm({ basic, trail, route, cover });
    if (!validation.isValid) {
      setValidationErrors(validation.errors || {});
      // Scroll to first error
      setTimeout(() => {
        const firstError = document.querySelector('.has-error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }
    
    // Clear validation errors if form is valid
    setValidationErrors({});

    setSubmitting(true);
    try {
      const fd = new FormData();
      
      // Basic information - safely handle undefined/null
      fd.append('name', basic?.name ? String(basic.name).trim() : '');
      fd.append('date', basic?.date ? String(basic.date) : '');
      fd.append('capacity', basic?.capacity !== undefined && basic?.capacity !== null ? String(basic.capacity) : '');
      fd.append('location', basic?.location ? String(basic.location).trim() : '');
      fd.append('difficulty', basic?.difficulty ? String(basic.difficulty) : 'EASY');
      fd.append('price', basic?.price !== undefined && basic?.price !== null ? String(basic.price) : '');
      fd.append('meetingTime', basic?.meetingTime ? String(basic.meetingTime) : '');
      fd.append('meetingPlace', basic?.meetingPlace ? String(basic.meetingPlace).trim() : '');
      fd.append('whatToBring', basic?.whatToBring ? String(basic.whatToBring) : '');
      
      // Trail details - safely convert numbers to strings
      fd.append('distance', trail?.distance !== undefined && trail?.distance !== null ? String(trail.distance) : '');
      
      // Duration: hours for single-day, days for multi-day
      const isMultiDay = trail?.isMultiDay === true || basic?.isMultiDay === true;
      if (isMultiDay) {
        fd.append('durationDays', trail?.durationDays !== undefined && trail?.durationDays !== null ? String(trail.durationDays) : '');
        fd.append('durationHours', ''); // Clear hours for multi-day
      } else {
        const durationHours = trail?.durationHours !== undefined ? trail.durationHours : trail?.duration;
        fd.append('durationHours', durationHours !== undefined && durationHours !== null ? String(durationHours) : '');
        fd.append('durationDays', ''); // Clear days for single-day
      }
      // Keep backward compatibility
      fd.append('duration', trail?.durationHours !== undefined ? String(trail.durationHours) : (trail?.duration !== undefined && trail?.duration !== null ? String(trail.duration) : ''));
      
      fd.append('elevationGain', trail?.elevationGain !== undefined && trail?.elevationGain !== null ? String(trail.elevationGain) : '');
      fd.append('description', trail?.description ? String(trail.description).trim() : '');

      // Multi-day hike fields
      fd.append('isMultiDay', isMultiDay ? 'true' : 'false');
      if (isMultiDay && basic?.date && trail?.durationDays) {
        // Calculate end date
        const startDate = new Date(basic.date);
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + (trail.durationDays - 1));
          fd.append('endDate', endDate.toISOString().split('T')[0]);
        }
      }

      // Route data - safely handle route object
      fd.append('route', JSON.stringify(route?.points || []));
      fd.append('mapLocation', JSON.stringify(route?.location || null));
      fd.append('destinations', JSON.stringify(route?.destinations || []));
      fd.append('mapMode', route?.mapMode || 'simple');

      // Cover image
      if (cover?.coverFile) {
        fd.append('cover', cover.coverFile);
      }

      await api.post('/hikes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate('/');
    } catch (e) {
      console.error('Create hike failed', e);
      setErr(e?.response?.data?.error || e.message || 'Failed to create hike');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-hike-page">
      <div className="create-hike-container">
        <div className="create-hike-header">
          <h1>Create New Hike</h1>
          <p>Fill in the details below to create your hiking adventure</p>
        </div>

        {err && <div className="alert-error">{err}</div>}

        <div className="form-sections">
          <div className="section-card">
            <BasicInformation value={basic} onChange={setBasic} errors={validationErrors.basic} />
          </div>
          <div className="section-card">
            <TrailDetails 
              value={trail} 
              onChange={(newValue) => {
                setTrail(newValue);
                // Sync isMultiDay to basic if it changes in trail
                if (newValue.isMultiDay !== undefined && newValue.isMultiDay !== basic.isMultiDay) {
                  setBasic(prev => ({ ...prev, isMultiDay: newValue.isMultiDay }));
                }
              }}
              errors={validationErrors.trail}
              onManualEdit={handleManualEdit}
              manuallyEdited={manuallyEdited}
              isMultiDay={trail.isMultiDay === true || basic.isMultiDay === true}
              onEnableMultiDay={() => {
                setTrail(prev => ({ ...prev, isMultiDay: true, durationDays: 2 }));
                setBasic(prev => ({ ...prev, isMultiDay: true }));
              }}
            />
          </div>
          <div className="section-card">
          <MapRoute 
            value={route || { points: [], destinations: [], location: null, mapMode: 'simple' }}
            isMultiDay={trail.isMultiDay === true || basic.isMultiDay === true}
            onEnableMultiDay={() => {
              setTrail(prev => ({ ...prev, isMultiDay: true, durationDays: 2 }));
              setBasic(prev => ({ ...prev, isMultiDay: true }));
            }}
            onChange={(newRoute) => {
              if (!newRoute || typeof newRoute !== 'object' || Array.isArray(newRoute)) {
                return;
              }
              
              setRoute(prev => {
                const safePrev = (prev && typeof prev === 'object' && !Array.isArray(prev)) 
                  ? prev 
                  : { points: [], destinations: [], location: null, mapMode: 'simple' };
                
                return {
                  points: Array.isArray(newRoute.points) ? newRoute.points : (Array.isArray(safePrev.points) ? safePrev.points : []),
                  destinations: Array.isArray(newRoute.destinations) ? newRoute.destinations : (Array.isArray(safePrev.destinations) ? safePrev.destinations : []),
                  location: (newRoute.location && typeof newRoute.location === 'object' && !Array.isArray(newRoute.location))
                    ? newRoute.location
                    : ((safePrev.location && typeof safePrev.location === 'object' && !Array.isArray(safePrev.location))
                      ? safePrev.location
                      : null),
                  mapMode: (newRoute.mapMode === 'simple' || newRoute.mapMode === 'destinations')
                    ? newRoute.mapMode
                    : (safePrev.mapMode || 'simple'),
                };
              });
            }} 
            errors={validationErrors.route || {}} 
          />
            </div>
          <div className="section-card">
            <WhatToBring value={basic} onChange={setBasic} />
          </div>
          <div className="section-card">
            <CoverImage value={cover} onChange={setCover} errors={validationErrors.cover} />
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn-cancel" onClick={() => navigate(-1)} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating…' : 'Create Hike'}</button>
        </div>
      </div>
    </div>
  );
}
