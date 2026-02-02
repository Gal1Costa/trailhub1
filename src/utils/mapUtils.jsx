import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Custom marker icons for destinations
const createDestinationIcon = (label, color = "#2d6a4f", size = 24) => {
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${size === 24 ? '12px' : '10px'};
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">${label}</div>`,
    className: "custom-destination-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Generate labels for destinations (A, B, C, etc.)
export const generateDestinationLabels = (points) => {
  if (!Array.isArray(points) || points.length === 0) return [];
  return points.map((point, index) => String.fromCharCode(65 + index)); // A, B, C, etc.
};

// Create destination markers for a route
export const createDestinationMarkers = (route, labels = null) => {
  if (!Array.isArray(route) || route.length === 0) return [];

  const destinationLabels = labels || generateDestinationLabels(route);

  return route.map((point, index) => {
    const label = destinationLabels[index] || String.fromCharCode(65 + index);
    return (
      <Marker
        key={`destination-${index}`}
        position={point}
        icon={createDestinationIcon(label)}
      >
        <Popup>
          <div style={{ textAlign: "center", fontWeight: "bold" }}>
            Destination {label}
            <br />
            <small>
              {point[0].toFixed(6)}, {point[1].toFixed(6)}
            </small>
          </div>
        </Popup>
      </Marker>
    );
  });
};

// Create start and end markers for a route
export const createStartEndMarkers = (route) => {
  if (!Array.isArray(route) || route.length === 0) return [];

  const markers = [];

  // Start marker
  markers.push(
    <Marker
      key="start-marker"
      position={route[0]}
      icon={createDestinationIcon("START", "#28a745", 16)}
    >
      <Popup>
        <div style={{ textAlign: "center", fontWeight: "bold" }}>
          Starting Point
          <br />
          <small>
            {route[0][0].toFixed(6)}, {route[0][1].toFixed(6)}
          </small>
        </div>
      </Popup>
    </Marker>
  );

  // End marker (only if different from start)
  if (route.length > 1) {
    markers.push(
      <Marker
        key="end-marker"
        position={route[route.length - 1]}
        icon={createDestinationIcon("END", "#dc3545", 16)}
      >
        <Popup>
          <div style={{ textAlign: "center", fontWeight: "bold" }}>
          End Point
          <br />
          <small>
            {route[route.length - 1][0].toFixed(6)}, {route[route.length - 1][1].toFixed(6)}
          </small>
        </div>
      </Popup>
    </Marker>
    );
  }

  return markers;
};

// Fit map bounds to route
export const fitMapToRoute = (map, route) => {
  if (!map || !Array.isArray(route) || route.length === 0) return;

  if (route.length === 1) {
    // Single point - center on it
    map.setView(route[0], 15);
  } else {
    // Multiple points - fit bounds
    const bounds = route.map(point => [point[0], point[1]]);
    map.fitBounds(bounds, { padding: [20, 20] });
  }
};

// Calculate route distance in kilometers
export const calculateRouteDistance = (route) => {
  if (!Array.isArray(route) || route.length < 2) return 0;

  const haversineKm = (a, b) => {
    const R = 6371; // km
    const toRad = (x) => (x * Math.PI) / 180;

    const lat1 = toRad(a[0]), lon1 = toRad(a[1]);
    const lat2 = toRad(b[0]), lon2 = toRad(b[1]);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(s));
  };

  let totalDistance = 0;
  for (let i = 1; i < route.length; i++) {
    totalDistance += haversineKm(route[i - 1], route[i]);
  }

  return totalDistance;
};

// Calculate estimated hiking duration in hours
export const calculateRouteDuration = (route, elevationGain = 0, difficulty = 'MODERATE') => {
  if (!Array.isArray(route) || route.length < 2) return 0;

  const distance = calculateRouteDistance(route);

  // Base hiking speeds (km/h) based on difficulty
  const baseSpeeds = {
    EASY: 4.0,      // Easy trails, good paths
    MODERATE: 3.0,  // Moderate trails, some scrambling
    HARD: 2.0       // Difficult trails, steep terrain
  };

  const baseSpeed = baseSpeeds[difficulty] || baseSpeeds.MODERATE;

  // Calculate base time from distance
  let durationHours = distance / baseSpeed;

  // Add time for elevation gain (Naismith's rule: 1 hour per 400m elevation gain)
  const elevationTimeHours = elevationGain / 400;

  // Total estimated time
  const totalHours = durationHours + elevationTimeHours;

  return totalHours;
};

// Format duration from hours to readable string
export const formatDuration = (hours) => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minutes`;
  }

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) {
    return wholeHours === 1 ? '1 hour' : `${wholeHours} hours`;
  }

  return `${wholeHours}h ${minutes}m`;
};