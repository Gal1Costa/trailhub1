import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Route, Navigation, Target, GripVertical, X, MapPin } from 'lucide-react';
import { calculateRouteDistance } from '../../utils/mapUtils.jsx';
import './MapRoute.css';
import 'leaflet/dist/leaflet.css';
// Fix Leaflet marker icons for bundlers (Vite/Webpack)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom icon creators
const createDestinationIcon = (number) => {
  return L.divIcon({
    html: `<div style="
      background-color: #10b981;
      color: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      border: 3px solid white;
      box-shadow: 0 10px 15px rgba(0,0,0,0.2);
    ">${number}</div>`,
    className: 'custom-destination-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createStartIcon = () => {
  return L.divIcon({
    html: `<div style="
      background-color: #10b981;
      color: white;
      border-radius: 50%;
      width: 12px;
      height: 12px;
      border: 2px solid white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    "></div>
    <div style="
      position: absolute;
      top: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
    ">START</div>`,
    className: 'custom-start-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const createEndIcon = () => {
  return L.divIcon({
    html: `<div style="
      background-color: #10b981;
      color: white;
      border-radius: 50%;
      width: 12px;
      height: 12px;
      border: 2px solid white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    "></div>
    <div style="
      position: absolute;
      top: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
    ">END</div>`,
    className: 'custom-end-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

// Map click handler component
function MapClickHandler({ onClick }) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e) => {
      if (onClick && typeof onClick === 'function') {
        onClick(e.latlng);
      }
    };
    
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, onClick]);
  
  return null;
}


export default function MapRoute({ value, onChange, errors, isMultiDay = false, onEnableMultiDay }) {
  // Normalize value to ensure it's always a valid object - handle null/undefined explicitly
  const normalizeValue = useCallback((val) => {
    // Explicitly handle null, undefined, or invalid types
    if (val === null || val === undefined || typeof val !== 'object' || Array.isArray(val)) {
      return {
        points: [],
        destinations: [],
        location: null,
        mapMode: 'simple',
      };
    }
    // Safely extract properties with defaults
    return {
      points: Array.isArray(val.points) ? val.points : [],
      destinations: Array.isArray(val.destinations) ? val.destinations : [],
      location: (val.location && typeof val.location === 'object' && val.location !== null && !Array.isArray(val.location)) 
        ? val.location 
        : null,
      mapMode: (val.mapMode === 'simple' || val.mapMode === 'destinations') ? val.mapMode : 'simple',
    };
  }, []);

  // Normalize value prop immediately - handle null/undefined explicitly
  const safeValue = value === null || value === undefined ? {} : value;
  const initialValue = useMemo(() => normalizeValue(safeValue), [normalizeValue, safeValue]);
  const currentValueRef = useRef(initialValue);
  
  // Helper to safely get current value from ref
  const getCurrentValue = useCallback(() => {
    let current = currentValueRef.current;
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      current = normalizeValue({});
      currentValueRef.current = current;
    }
    return current;
  }, [normalizeValue]);
  
  useEffect(() => {
    const safeValue = value === null || value === undefined ? {} : value;
    const normalized = normalizeValue(safeValue);
    currentValueRef.current = (normalized && typeof normalized === 'object' && !Array.isArray(normalized))
      ? normalized
      : normalizeValue({});
  }, [value, normalizeValue]);
  
  // Normalize value for rendering
  const currentValue = normalizeValue(safeValue);
  const route = Array.isArray(currentValue.points) ? currentValue.points : [];
  const destinations = Array.isArray(currentValue.destinations) ? currentValue.destinations : [];
  const [mapMode, setMapMode] = useState(currentValue.mapMode || 'simple');

  useEffect(() => {
    if (currentValue.mapMode && currentValue.mapMode !== mapMode) {
      const newMode = currentValue.mapMode;
      setMapMode(newMode);
      
      // If mode changed externally, ensure opposite mode's data is cleared
      const current = getCurrentValue();
      if (current && typeof current === 'object' && !Array.isArray(current) && onChange) {
        const hasPoints = Array.isArray(current.points) && current.points.length > 0;
        const hasDestinations = Array.isArray(current.destinations) && current.destinations.length > 0;
        
        // Only clear if opposite mode has data (avoid unnecessary onChange calls)
        // If switching to simple mode and destinations exist, clear them
        if (newMode === 'simple' && hasDestinations) {
          onChange({
            points: Array.isArray(current.points) ? current.points : [],
            destinations: [],
            location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
              ? current.location
              : null,
            mapMode: newMode,
          });
        }
        // If switching to destinations mode and points exist, clear them
        else if (newMode === 'destinations' && hasPoints) {
          onChange({
            points: [],
            destinations: Array.isArray(current.destinations) ? current.destinations : [],
            location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
              ? current.location
              : null,
            mapMode: newMode,
          });
        }
      }
    }
  }, [currentValue.mapMode, mapMode, getCurrentValue, onChange]);

  const [draggedDestination, setDraggedDestination] = useState(null);

  const getError = (field) => {
    if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return undefined;
    return errors[field];
  };

  const center = useMemo(() => {
    if (route && route.length > 0) {
      return route[0];
    }
    if (destinations && destinations.length > 0) {
      const firstDest = destinations.find(d => d && d.lat != null && d.lng != null);
      if (firstDest) {
        return [firstDest.lat, firstDest.lng];
      }
    }
    return [41.7151, 44.8271]; // Default: Tbilisi
  }, [route, destinations]);

  const handleMapClick = useCallback((latlng) => {
    if (!latlng || typeof latlng.lat !== 'number' || typeof latlng.lng !== 'number' || !onChange) {
      return;
    }

    const current = getCurrentValue();
    if (!current || typeof current !== 'object' || Array.isArray(current)) return;
    
    const currentRoute = Array.isArray(current.points) ? current.points : [];
    const currentDestinations = Array.isArray(current.destinations) ? current.destinations : [];
    const currentLocation = (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
      ? current.location
      : null;
    
    if (mapMode === 'simple') {
      const newPoint = [latlng.lat, latlng.lng];
      console.log('[MapRoute] Adding point to simple route:', {
        newPoint,
        totalPoints: currentRoute.length + 1,
        allPoints: [...currentRoute, newPoint]
      });
      onChange({
        points: [...currentRoute, newPoint],
        destinations: currentDestinations,
        location: currentLocation || { lat: latlng.lat, lng: latlng.lng },
        mapMode: 'simple',
      });
    } else {
      const newDest = {
        id: Date.now().toString(),
        name: `Destination ${currentDestinations.length + 1}`,
        lat: latlng.lat,
        lng: latlng.lng,
      };
      console.log('[MapRoute] Adding destination to destinations route:', {
        newDest,
        totalDestinations: currentDestinations.length + 1,
        allDestinations: [...currentDestinations, newDest]
      });
      onChange({
        points: currentRoute,
        destinations: [...currentDestinations, newDest],
        location: currentLocation || { lat: latlng.lat, lng: latlng.lng },
        mapMode: 'destinations',
      });
    }
  }, [mapMode, onChange, getCurrentValue]);

  const getTotalRouteDistance = useCallback(() => {
    if (mapMode === 'simple') {
      if (!route || route.length < 2) return 0;
      return calculateRouteDistance(route).toFixed(1);
    } else {
      if (!destinations || destinations.length < 2) return 0;
      const points = destinations
        .filter(d => d && d.lat != null && d.lng != null)
        .map(d => [d.lat, d.lng]);
      if (points.length < 2) return 0;
      return calculateRouteDistance(points).toFixed(1);
    }
  }, [destinations, route, mapMode]);
  
  // Calculate suggested days based on distance
  const calculateSuggestedDays = useCallback((distance) => {
    if (distance <= 15) return 1;
    if (distance <= 25) return 2;
    if (distance <= 40) return 3;
    if (distance <= 60) return 4;
    return Math.ceil(distance / 15);
  }, []);
  
  // Get current route distance for suggestion
  const currentRouteDistance = useMemo(() => {
    const distanceStr = getTotalRouteDistance();
    return distanceStr ? parseFloat(distanceStr) : 0;
  }, [getTotalRouteDistance]);
  
  const suggestedDays = useMemo(() => {
    if (currentRouteDistance <= 0) return null;
    return calculateSuggestedDays(currentRouteDistance);
  }, [currentRouteDistance, calculateSuggestedDays]);
  
  const showRouteSuggestion = currentRouteDistance > 20 && !isMultiDay;

  const handleModeToggle = (mode) => {
    const current = getCurrentValue();
    if (!current || typeof current !== 'object' || Array.isArray(current) || !onChange) return;
    
    // Clear the opposite mode's data when switching
    if (mode === 'simple') {
      // Switching to simple mode - clear destinations
      setMapMode(mode);
      onChange({
        points: Array.isArray(current.points) ? current.points : [],
        destinations: [], // Clear destinations
        location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
          ? current.location
          : null,
        mapMode: mode,
      });
    } else {
      // Switching to destinations mode - clear points
      setMapMode(mode);
      onChange({
        points: [], // Clear points
        destinations: Array.isArray(current.destinations) ? current.destinations : [],
        location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
          ? current.location
          : null,
        mapMode: mode,
      });
    }
  };

  const handleUpdateDestinationName = (id, name) => {
    if (!onChange || typeof onChange !== 'function') return;
    const current = getCurrentValue();
    if (!current || typeof current !== 'object' || Array.isArray(current)) return;
    const currentDestinations = Array.isArray(current.destinations) ? current.destinations : [];
    if (currentDestinations.length === 0) return;
    
    // Safe spread - dest is checked to be truthy before spreading
    const updated = currentDestinations.map(dest => {
      if (!dest || typeof dest !== 'object') return dest;
      return dest.id === id ? { ...dest, name } : dest;
    }).filter(Boolean);
    
    onChange({
      points: Array.isArray(current.points) ? current.points : [],
      destinations: updated,
      location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location)) 
        ? current.location 
        : null,
      mapMode,
    });
  };

  const handleDeleteDestination = (id) => {
    const current = getCurrentValue();
    if (!current || typeof current !== 'object' || Array.isArray(current) || !onChange) return;
    const currentDestinations = Array.isArray(current.destinations) ? current.destinations : [];
    if (currentDestinations.length === 0) return;
    
    onChange({
      points: Array.isArray(current.points) ? current.points : [],
      destinations: currentDestinations.filter(dest => dest && dest.id !== id),
      location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
        ? current.location
        : null,
      mapMode,
    });
  };

  const handleDragStart = (id) => {
    setDraggedDestination(id);
  };

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();
    if (!onChange || typeof onChange !== 'function') return;
    const current = getCurrentValue();
    if (!current || typeof current !== 'object' || Array.isArray(current)) return;
    const currentDestinations = Array.isArray(current.destinations) ? current.destinations : [];
    
    if (currentDestinations.length === 0 || draggedDestination === id) return;

    const draggedIndex = currentDestinations.findIndex(d => d && d.id === draggedDestination);
    const targetIndex = currentDestinations.findIndex(d => d && d.id === id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Safe array spread - currentDestinations is guaranteed to be an array
    const newDestinations = [...currentDestinations].filter(Boolean);
    const [removed] = newDestinations.splice(draggedIndex, 1);
    if (removed) {
      newDestinations.splice(targetIndex, 0, removed);
    }

    onChange({
      points: Array.isArray(current.points) ? current.points : [],
      destinations: newDestinations,
      location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location)) 
        ? current.location 
        : null,
      mapMode,
    });
  }, [draggedDestination, mapMode, onChange, getCurrentValue]);

  const handleDragEnd = () => {
    setDraggedDestination(null);
  };

  const undoLastPoint = () => {
    const current = getCurrentValue();
    if (!current || typeof current !== 'object' || Array.isArray(current) || !onChange) return;
    
    if (mapMode === 'simple') {
      const currentRoute = Array.isArray(current.points) ? current.points : [];
      if (currentRoute.length === 0) return;
      onChange({
        points: currentRoute.slice(0, -1),
        destinations: Array.isArray(current.destinations) ? current.destinations : [],
        location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
          ? current.location
          : null,
        mapMode,
      });
    } else {
      const currentDestinations = Array.isArray(current.destinations) ? current.destinations : [];
      if (currentDestinations.length === 0) return;
      onChange({
        points: Array.isArray(current.points) ? current.points : [],
        destinations: currentDestinations.slice(0, -1),
        location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
          ? current.location
          : null,
        mapMode,
      });
    }
  };

  const clearRoute = () => {
    const current = getCurrentValue();
    if (!current || typeof current !== 'object' || Array.isArray(current) || !onChange) return;
    
    if (mapMode === 'simple') {
      onChange({
        points: [],
        destinations: Array.isArray(current.destinations) ? current.destinations : [],
        location: null,
        mapMode,
      });
    } else {
      onChange({
        points: Array.isArray(current.points) ? current.points : [],
        destinations: [],
        location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
          ? current.location
          : null,
        mapMode,
      });
    }
  };

  const clearDestinations = () => {
    const current = getCurrentValue();
    if (!current || typeof current !== 'object' || Array.isArray(current) || !onChange) return;
    onChange({
      points: Array.isArray(current.points) ? current.points : [],
      destinations: [],
      location: (current.location && typeof current.location === 'object' && !Array.isArray(current.location))
        ? current.location
        : null,
      mapMode,
    });
  };

  const destinationPositions = (destinations || [])
    .filter(d => d && d.lat != null && d.lng != null)
    .map(d => [d.lat, d.lng]);

  return (
    <div className="map-route-container">
      <div className="map-header">
        <div>
          <h2 className="map-route-title-small">Route Planning</h2>
          <p className="map-header-description">
            {mapMode === 'simple'
              ? 'Click on the map to draw your route'
              : 'Click to add destination markers with names'}
          </p>
        </div>
      </div>

      <div className="mode-toggle">
        <button
          type="button"
          onClick={() => handleModeToggle('simple')}
          className={`mode-toggle-btn ${mapMode === 'simple' ? 'active' : ''}`}
        >
          <Route className="mode-toggle-icon" size={16} />
          Simple Route
        </button>
        <button
          type="button"
          onClick={() => handleModeToggle('destinations')}
          className={`mode-toggle-btn ${mapMode === 'destinations' ? 'active' : ''}`}
        >
          <MapPin className="mode-toggle-icon" size={16} />
          Destinations Mode
        </button>
      </div>

      <div className="map-controls-row">
        <div className="map-controls-left">
          {mapMode === 'destinations' && destinations && destinations.length > 0 && (
            <div className="stats-badge">
              <Navigation className="stats-icon" size={16} />
              <span>
                {destinations.length} {destinations.length === 1 ? 'destination' : 'destinations'} • {getTotalRouteDistance()} km
              </span>
            </div>
          )}
        </div>

        <div className="map-controls-right">
          <button
            type="button"
            className="control-btn"
            onClick={undoLastPoint}
            disabled={mapMode === 'simple' ? (!route || route.length === 0) : (!destinations || destinations.length === 0)}
          >
            Undo
          </button>
          <button
            type="button"
            className="control-btn"
            onClick={clearRoute}
            disabled={mapMode === 'simple' ? (!route || route.length === 0) : (!destinations || destinations.length === 0)}
          >
            Clear
          </button>
        </div>
      </div>

      {showRouteSuggestion && (
        <div className="route-elegant-suggestion">
          <span className="route-elegant-suggestion-icon">↠</span>
          <span className="route-elegant-suggestion-text">Better as a multi-day route</span>
        </div>
      )}

      <div className="map-canvas">
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          className="leaflet-map-container"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <MapClickHandler onClick={handleMapClick} />

          {mapMode === 'simple' ? (
            <>
              {route.length > 1 && (
                <Polyline
                  positions={route}
                  color="#10b981"
                  weight={3}
                  opacity={0.8}
                  strokeLinecap="round"
                />
              )}

              {route.map((point, index) => (
                <Marker
                  key={`route-point-${index}`}
                  position={point}
                  icon={
                    index === 0
                      ? createStartIcon()
                      : index === route.length - 1 && route.length > 1
                      ? createEndIcon()
                      : L.divIcon({
                          html: `<div style="
                            background-color: #10b981;
                            color: white;
                            border-radius: 50%;
                            width: 12px;
                            height: 12px;
                            border: 2px solid white;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                          "></div>`,
                          className: 'custom-route-point',
                          iconSize: [12, 12],
                          iconAnchor: [6, 6],
                        })
                  }
                />
              ))}
            </>
          ) : (
            <>
              {destinations.length > 1 && (
                <Polyline
                  positions={destinationPositions}
                  color="#10b981"
                  weight={3}
                  opacity={0.8}
                  strokeLinecap="round"
                  dashArray="8, 4"
                />
              )}

              {destinations
                .filter(d => d && d.lat != null && d.lng != null)
                .map((dest, index) => (
                  <Marker
                    key={dest.id}
                    position={[dest.lat, dest.lng]}
                    icon={createDestinationIcon(index + 1)}
                  >
                    <Popup>
                      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {dest.name || `Destination ${index + 1}`}
                        <br />
                        <small>
                          {dest.lat.toFixed(6)}, {dest.lng.toFixed(6)}
                        </small>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </>
          )}
        </MapContainer>

        {(!route || route.length === 0) && (!destinations || destinations.length === 0) && (
          <div className="map-empty-state">
            <Route className="empty-icon" size={48} />
            <p className="empty-text">Click to plot your route</p>
          </div>
        )}
      </div>

      {mapMode === 'destinations' && destinations && destinations.length > 0 && (
        <div className="destinations-panel">
          <div className="destinations-header">
            <h3 className="destinations-title">
              <Target className="destinations-title-icon" size={16} />
              Destinations ({destinations.length})
            </h3>
            <p className="destinations-hint">Drag to reorder</p>
          </div>

          <div className="destinations-list">
            {destinations.filter(d => d).map((dest, index) => (
              <div
                key={dest.id}
                draggable
                onDragStart={() => handleDragStart(dest.id)}
                onDragOver={(e) => handleDragOver(e, dest.id)}
                onDragEnd={handleDragEnd}
                className={`destination-row ${draggedDestination === dest.id ? 'dragging' : ''}`}
              >
                <GripVertical className="drag-handle" size={16} />
                <div className="destination-number-badge">{index + 1}</div>
                <input
                  type="text"
                  value={dest.name}
                  onChange={(e) => handleUpdateDestinationName(dest.id, e.target.value)}
                  className="destination-name-input"
                />
                <span className="destination-coords">
                  {dest.lat != null && dest.lng != null ? `${dest.lat.toFixed(4)}, ${dest.lng.toFixed(4)}` : 'N/A'}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteDestination(dest.id)}
                  className="destination-delete-btn"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

        </div>
      )}

      {errors?.points && (
        <div className="map-errors">
          <div className="field-error">{errors.points}</div>
        </div>
      )}
    </div>
  );
}
