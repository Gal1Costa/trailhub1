import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import BasicInformation from './create/BasicInformation';
import TrailDetails from './create/TrailDetails';
import MapRoute from './create/MapRoute';
import WhatToBring from './create/WhatToBring';
import CoverImage from './create/CoverImage';
import { calculateRouteDistance, calculateRouteDuration } from '../utils/mapUtils.jsx';
import { validateHikeForm } from '../utils/hikeValidation.jsx';
import './EditHikeForm.css';

export default function EditHikeForm({ hike, onSave, onCancel, onDelete, deleting }) {
  // Initialize state from hike data
  const [basic, setBasic] = useState({
    name: hike?.name || hike?.title || '',
    date: hike?.date ? new Date(hike.date).toISOString().split('T')[0] : '',
    meetingTime: hike?.meetingTime || '',
    meetingPlace: hike?.meetingPlace || '',
    location: hike?.location || '',
    capacity: hike?.capacity || '',
    price: hike?.price || '',
    difficulty: hike?.difficulty || 'EASY',
  });
  
  const [trail, setTrail] = useState({
    distance: hike?.distance || '',
    durationHours: hike?.duration || '',
    duration: hike?.duration || '',
    durationDays: hike?.durationDays || '',
    isMultiDay: hike?.isMultiDay || false,
    elevationGain: hike?.elevationGain || '',
    description: hike?.description || '',
  });
  
  const [route, setRoute] = useState({
    points: Array.isArray(hike?.route) ? [...hike.route] : [],
    destinations: Array.isArray(hike?.destinations) ? [...hike.destinations] : [],
    location: hike?.mapLocation || null,
    mapMode: (hike?.destinations && hike.destinations.length > 0) ? 'destinations' : 'simple'
  });
  
  const [whatToBring, setWhatToBring] = useState({
    whatToBring: Array.isArray(hike?.whatToBring) 
      ? hike.whatToBring.join('\n')
      : (typeof hike?.whatToBring === 'string' ? hike.whatToBring : '')
  });
  
  const [cover, setCover] = useState({
    previewUrl: hike?.imageUrl || hike?.coverUrl || null,
    coverFile: null,
    croppedFile: null
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [manuallyEdited, setManuallyEdited] = useState({ distance: false, duration: false });
  const manuallyEditedRef = useRef({ distance: false, duration: false });
  
  // Sync ref with state
  useEffect(() => {
    manuallyEditedRef.current = manuallyEdited;
  }, [manuallyEdited]);
  
  // Log route state changes for debugging
  useEffect(() => {
    console.log('[EditHikeForm] Route state changed:', {
      mapMode: route.mapMode,
      pointsCount: route.points?.length || 0,
      destinationsCount: route.destinations?.length || 0,
      hasLocation: !!route.location,
      pointsSample: route.points?.slice(0, 2),
      destinationsSample: route.destinations?.slice(0, 2)
    });
  }, [route]);
  
  // Auto-calculate distance and duration when route changes
  const routeChangeKey = useMemo(() => {
    if (route.mapMode === 'destinations') {
      return `dest-${route.destinations?.length || 0}-${JSON.stringify(route.destinations || [])}`;
    } else {
      return `points-${route.points?.length || 0}-${JSON.stringify(route.points || [])}`;
    }
  }, [route.points, route.destinations, route.mapMode]);
  
  useEffect(() => {
    const mapMode = route.mapMode || 'simple';
    let routePoints = [];
    
    if (mapMode === 'destinations') {
      if (Array.isArray(route.destinations) && route.destinations.length >= 2) {
        routePoints = route.destinations
          .filter(d => d && d.lat != null && d.lng != null)
          .map(d => [d.lat, d.lng]);
      }
    } else {
      if (Array.isArray(route.points) && route.points.length >= 2) {
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
    
    if (routePoints.length < 2) return;
    
    const distanceKm = calculateRouteDistance(routePoints);
    if (distanceKm <= 0) return;
    
    const elevationGainValue = parseFloat(String(trail.elevationGain).replace(/[^\d.]/g, '')) || 0;
    const difficulty = basic.difficulty || 'MODERATE';
    
    // Only update distance if user hasn't manually edited it
    if (!manuallyEditedRef.current.distance) {
      const newDistance = parseFloat(distanceKm.toFixed(1));
      const currentDistance = trail.distance;
      const currentDistanceNum = typeof currentDistance === 'number' ? currentDistance : parseFloat(currentDistance);
      
      // Only update if the value would actually change (use threshold to avoid floating point precision issues)
      const shouldUpdate = currentDistance === '' || currentDistance === null || currentDistance === undefined || trail._distanceAutoCalculated;
      const valueChanged = isNaN(currentDistanceNum) || Math.abs(currentDistanceNum - newDistance) > 0.01;
      
      if (shouldUpdate && valueChanged) {
        setTrail(prev => ({ 
          ...prev, 
          distance: newDistance,
          _distanceAutoCalculated: true 
        }));
      }
    }
    
    // Only update duration if user hasn't manually edited it and it's not multi-day
    if (!manuallyEditedRef.current.duration && !trail.isMultiDay) {
      const durationHours = calculateRouteDuration(routePoints, elevationGainValue, difficulty);
      if (durationHours > 0) {
        const hours = Math.floor(durationHours);
        const mins = Math.round((durationHours - hours) * 60);
        let formatted = `${hours}`;
        if (mins > 0) formatted += `-${hours + 1}`;
        formatted += ' hours';
        
        const currentDuration = trail.duration || trail.durationHours;
        
        // Only update if the value would actually change
        if (currentDuration !== formatted && (currentDuration === '' || currentDuration === null || currentDuration === undefined || trail._durationHoursAutoCalculated)) {
          setTrail(prev => ({ 
            ...prev, 
            duration: formatted,
            durationHours: formatted,
            _durationHoursAutoCalculated: true 
          }));
        }
      }
    }
  }, [routeChangeKey, trail.elevationGain, basic.difficulty, trail.isMultiDay]);
  
  const handleManualEdit = (field) => {
    setManuallyEdited(prev => ({...prev, [field]: true}));
  };

  async function handleSubmit(e) {
    e?.preventDefault();
    
    console.log('[EditHikeForm] Submit initiated with current state:', {
      routePoints: route.points?.length,
      destinations: route.destinations?.length,
      mapMode: route.mapMode,
      hasNewImage: !!cover.coverFile,
      capacity: basic.capacity
    });
    
    // Validate form - structure must match validateHikeForm expectations
    const formData = {
      basic: {
        name: basic.name,
        date: basic.date,
        meetingTime: basic.meetingTime,
        meetingPlace: basic.meetingPlace,
        location: basic.location,
        capacity: basic.capacity ? Number(basic.capacity) : '',
        price: basic.price ? Number(basic.price) : '',
        difficulty: basic.difficulty,
      },
      trail: {
        distance: trail.distance,
        duration: trail.duration,
        durationHours: trail.durationHours,
        durationDays: trail.durationDays,
        isMultiDay: trail.isMultiDay,
        elevationGain: trail.elevationGain,
        description: trail.description,
      },
      route: {
        points: route.mapMode === 'destinations' 
          ? route.destinations.map(d => [d.lat, d.lng])
          : route.points,
        destinations: route.mapMode === 'destinations' ? route.destinations : [],
        mapMode: route.mapMode,
        mapLocation: route.location,
      },
      cover: {
        previewUrl: cover.previewUrl,
        coverFile: cover.coverFile,
      }
    };
    
    const validation = validateHikeForm(formData);
    if (!validation.isValid) {
      console.error('Validation failed:', validation.errors);
      setValidationErrors(validation.errors);
      setErr('Please fix the errors before saving');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setValidationErrors({});
    setSubmitting(true);
    setErr(null);
    setSuccessMessage(null);

    try {
      const fd = new FormData();
      
      // Add basic fields
      if (basic.name) fd.append('title', basic.name);
      if (basic.date) fd.append('date', basic.date);
      if (basic.meetingTime) fd.append('meetingTime', basic.meetingTime);
      if (basic.meetingPlace) fd.append('meetingPlace', basic.meetingPlace);
      if (basic.location) fd.append('location', basic.location);
      if (basic.capacity) fd.append('capacity', basic.capacity);
      if (basic.price !== undefined && basic.price !== '') fd.append('price', basic.price);
      if (basic.difficulty) fd.append('difficulty', basic.difficulty);
      
      // Add trail fields
      if (trail.distance) fd.append('distance', trail.distance);
      if (trail.isMultiDay) {
        fd.append('isMultiDay', 'true');
        if (trail.durationDays) fd.append('durationDays', trail.durationDays);
      } else {
        if (trail.duration) fd.append('duration', trail.duration);
      }
      if (trail.elevationGain) fd.append('elevationGain', trail.elevationGain);
      if (trail.description) fd.append('description', trail.description);
      
      // Add route data
      if (route.mapMode === 'destinations' && route.destinations?.length > 0) {
        const routeData = route.destinations.map(d => [d.lat, d.lng]);
        console.log('[EditHikeForm] Adding destinations route to FormData:', {
          mapMode: 'destinations',
          destinationsCount: route.destinations.length,
          routeData: routeData,
          destinationsData: route.destinations
        });
        fd.append('route', JSON.stringify(routeData));
        fd.append('destinations', JSON.stringify(route.destinations));
        fd.append('mapMode', 'destinations');
      } else if (route.points?.length > 0) {
        console.log('[EditHikeForm] Adding simple route to FormData:', {
          mapMode: 'simple',
          pointsCount: route.points.length,
          routeData: route.points
        });
        fd.append('route', JSON.stringify(route.points));
        fd.append('mapMode', 'simple');
      } else {
        console.log('[EditHikeForm] No route data to save');
      }
      
      if (route.location) {
        fd.append('mapLocation', JSON.stringify(route.location));
      }
      
      // Add what to bring
      if (whatToBring.whatToBring) {
        fd.append('whatToBring', String(whatToBring.whatToBring));
      }
      
      // Add cover image if changed
      const imageFileToUpload = cover.coverFile;
      if (imageFileToUpload) {
        console.log('[EditHikeForm] Adding image to FormData:', {
          fileName: imageFileToUpload.name,
          fileSize: imageFileToUpload.size,
          fileType: imageFileToUpload.type
        });
        fd.append('cover', imageFileToUpload);
      } else {
        console.log('[EditHikeForm] No new image file to upload');
      }

      const response = await api.put(`/hikes/${hike.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[EditHikeForm] Save successful, response received:', {
        id: response.data.id,
        title: response.data.title,
        hasRoute: !!response.data.route,
        routeLength: response.data.route?.length,
        destinationsLength: response.data.destinations?.length,
        mapMode: response.data.mapMode,
        hasImageUrl: !!response.data.imageUrl,
        hasCoverUrl: !!response.data.coverUrl
      });
      
      setSubmitting(false);
      
      // Call onSave callback immediately to trigger parent reload/navigation
      console.log('[EditHikeForm] Calling onSave callback');
      onSave?.();
    } catch (e) {
      console.error('Edit hike failed:', e);
      setErr(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to update hike');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="edit-hike-form">
      <div className="edit-hike-header">
        <h2>Edit Hike</h2>
        {successMessage && (
          <div style={{
            padding: '12px 16px',
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            color: '#166534',
            fontSize: '14px',
            marginTop: '12px',
            fontWeight: '500'
          }}>
            {successMessage}
          </div>
        )}
        {err && (
          <div className="error-message">
            <div>{err}</div>
            {validationErrors && Object.keys(validationErrors).length > 0 && (
              <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.9 }}>
                {Object.entries(validationErrors).map(([section, errors]) => (
                  <div key={section}>
                    <strong>{section}:</strong> {
                      typeof errors === 'object' 
                        ? Object.values(errors).join(', ') 
                        : errors
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BasicInformation 
        value={basic} 
        onChange={setBasic} 
        errors={validationErrors}
        disabled={submitting}
      />
      
      <TrailDetails 
        value={trail} 
        onChange={setTrail} 
        errors={validationErrors}
        onManualEdit={handleManualEdit}
        manuallyEdited={manuallyEdited}
        isMultiDay={trail.isMultiDay}
        disabled={submitting}
      />
      
      <div className="section-container">
        <h2 className="section-title">Trail Map & Route</h2>
        <MapRoute 
          value={route} 
          onChange={setRoute}
          errors={validationErrors}
          isMultiDay={trail.isMultiDay}
          disabled={submitting}
        />
      </div>
      
      <WhatToBring 
        value={whatToBring} 
        onChange={setWhatToBring}
        errors={validationErrors}
        disabled={submitting}
      />
      
      <CoverImage 
        value={cover} 
        onChange={setCover}
        errors={validationErrors}
        disabled={submitting}
      />

      <div className="edit-hike-actions">
        <button 
          type="button"
          className="btn-cancel" 
          onClick={onCancel} 
          disabled={submitting || deleting}
        >
          {submitting ? 'Saving...' : 'Cancel'}
        </button>
        
        {onDelete && (
          <button 
            type="button"
            className="btn-delete" 
            onClick={onDelete} 
            disabled={submitting || deleting}
            style={{ 
              marginLeft: 'auto', 
              marginRight: '8px',
              background: 'white',
              border: '1px solid #ef4444',
              color: '#ef4444'
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Hike'}
          </button>
        )}
        
        <button 
          type="button"
          className="btn-primary" 
          onClick={handleSubmit} 
          disabled={submitting || deleting}
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
