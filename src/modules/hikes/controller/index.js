/* eslint-disable */
//src/modules/hikes/controller/index.js
const { Router } = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const repo = require('../repository');
const { handleFileUploads } = require('../utils/uploadHandler');
const { send400, send401, send403, send404, send500, send501 } = require('../../../shared/errorResponses');

let usersRepo;
try { usersRepo = require('../../users/repository'); } catch (e) { console.warn('[hikes/controller] users repo missing:', e.message); }
let bookingsRepo;
try { bookingsRepo = require('../../bookings/repository'); } catch (e) { console.warn('[hikes/controller] bookings repo missing:', e.message); }

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

/* ------------------- ROUTE FILE HELPERS ------------------- */

function ensureRoutesDir() {
  const routesDir = path.join(__dirname, '..', 'uploads', 'routes');
  if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });
  return routesDir;
}

function safeJsonParse(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveRouteFile({ hikeId, mapLocation, points, destinations, mapMode }) {
  const routesDir = ensureRoutesDir();
  const filename = `${hikeId}.json`;
  const absPath = path.join(routesDir, filename);

  const payload = {
    version: 1,
    hikeId,
    savedAt: new Date().toISOString(),
    mapLocation: mapLocation ?? null,
    points: Array.isArray(points) ? points : [],
    destinations: Array.isArray(destinations) ? destinations : null,
    mapMode: mapMode || null,
  };

  fs.writeFileSync(absPath, JSON.stringify(payload, null, 2), 'utf-8');
  return `/hikes/uploads/routes/${filename}`; // public URL path
}

function readRouteFile(routePath) {
  if (!routePath) return null;
  try {
    const filename = path.basename(routePath);
    const absPath = path.join(__dirname, '..', 'uploads', 'routes', filename);
    const raw = fs.readFileSync(absPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Read route data from either a URL (Spaces CDN) or local file path.
 * @param {string} routePath - Either a URL (https://...) or local path
 * @returns {Promise<Object|null>} Route data or null
 */
async function readRouteAny(routePath) {
  if (!routePath || typeof routePath !== 'string') return null;

  // If it's a URL (Spaces CDN), fetch it with timeout and cache-busting
  if (/^https?:\/\//i.test(routePath)) {
    try {
      // Add timestamp to bust cache
      const separator = routePath.includes('?') ? '&' : '?';
      const urlWithCacheBust = `${routePath}${separator}_t=${Date.now()}`;
      
      // Use AbortController for timeout (10 seconds) - available in Node.js 18+
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const r = await fetch(urlWithCacheBust, { 
          signal: controller.signal,
          headers: { 
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!r.ok) {
          console.warn(`[readRouteAny] HTTP ${r.status} for route: ${routePath}`);
          return null;
        }
        
        const data = await r.json();
        console.log(`[readRouteAny] Successfully fetched route from CDN:`, {
          url: routePath,
          hasPoints: !!data?.points,
          pointsLength: data?.points?.length,
          hasDestinations: !!data?.destinations,
          mapMode: data?.mapMode
        });
        return data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn(`[readRouteAny] Timeout fetching route: ${routePath}`);
        } else {
          console.warn(`[readRouteAny] Fetch error for route: ${routePath}`, fetchError.message || fetchError);
        }
        return null;
      }
    } catch (error) {
      console.warn(`[readRouteAny] Error fetching route: ${routePath}`, error.message || error);
      return null;
    }
  }

  // Else local path
  try {
    return readRouteFile(routePath);
  } catch (error) {
    console.warn(`[readRouteAny] Error reading local route file: ${routePath}`, error.message || error);
    return null;
  }
}

/**
 * Save route JSON to Spaces storage (if available) or fallback to local file.
 * @param {Object} params
 * @param {string} params.hikeId - Hike ID
 * @param {Object|null} params.mapLocation - Map location data
 * @param {Array} params.points - Route points array (for simple mode or converted from destinations)
 * @param {Array} params.destinations - Destinations array (for destinations mode)
 * @param {string} params.mapMode - Map mode: 'simple' or 'destinations'
 * @param {Object|null} params.storageAdapter - Spaces storage adapter (or null)
 * @returns {Promise<string>} URL or local path
 */
async function saveRouteToStorage({ hikeId, mapLocation, points, destinations, mapMode, storageAdapter }) {
  const payload = {
    version: 1,
    hikeId,
    savedAt: new Date().toISOString(),
    mapLocation: mapLocation ?? null,
    points: Array.isArray(points) ? points : [],
    destinations: Array.isArray(destinations) ? destinations : null,
    mapMode: mapMode || null,
  };

  const key = `routes/${hikeId}.json`;
  const buf = Buffer.from(JSON.stringify(payload, null, 2), "utf-8");

  console.log(`[saveRouteToStorage] Attempting to save route:`, {
    hikeId,
    key,
    payloadSize: buf.length,
    hasStorageAdapter: !!storageAdapter,
    mapMode,
    pointsCount: Array.isArray(points) ? points.length : 0,
    destinationsCount: Array.isArray(destinations) ? destinations.length : 0,
  });

  // If adapter works, store in Spaces
  if (storageAdapter?.uploadObject) {
    try {
      console.log(`[saveRouteToStorage] Uploading to DigitalOcean Spaces: ${key}`);
      const uploaded = await storageAdapter.uploadObject(key, buf, "application/json");
      if (uploaded?.url) {
        console.log(`[saveRouteToStorage] Successfully uploaded to Spaces: ${uploaded.url}`);
        return uploaded.url; // store CDN URL in DB
      } else {
        console.warn(`[saveRouteToStorage] Upload returned no URL, using fallback`);
      }
    } catch (e) {
      console.error("[saveRouteToStorage] Upload to storage failed, fallback to local:", e.message || e);
      console.error("[saveRouteToStorage] Error details:", e);
    }
  } else {
    console.warn("[saveRouteToStorage] No storage adapter available, using local fallback");
  }

  // fallback local
  console.log(`[saveRouteToStorage] Saving to local file as fallback`);
  return saveRouteFile({ hikeId, mapLocation, points, destinations, mapMode });
}

function haversineKm(a, b) {
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
}

function totalRouteKm(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += haversineKm(points[i - 1], points[i]);
  }
  return sum;
}


/* ------------------- HIKES ------------------- */

// GET /api/hikes
router.get('/', async (req, res, next) => {
  try {
    if (!repo?.listHikes) return send501(res, 'listHikes not implemented');

    const filters = {
      search: req.query.search,
      difficulty: req.query.difficulty,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
      priceFrom: req.query.priceFrom !== undefined ? Number(req.query.priceFrom) : undefined,
      priceTo: req.query.priceTo !== undefined ? Number(req.query.priceTo) : undefined,
      location: req.query.location,
    };

    // optional: clean NaN
    if (Number.isNaN(filters.dateFrom?.getTime())) delete filters.dateFrom;
    if (Number.isNaN(filters.dateTo?.getTime())) delete filters.dateTo;
    if (Number.isNaN(filters.priceFrom)) delete filters.priceFrom;
    if (Number.isNaN(filters.priceTo)) delete filters.priceTo;

    console.log('[hikes/controller] GET /api/hikes - filters:', filters);
    
    const data = await repo.listHikes(filters);
    console.log('[hikes/controller] GET /api/hikes - returning', data?.length || 0, 'hikes');
    res.json(data);
  } catch (err) {
    console.error('[hikes/controller] Error in GET /api/hikes:', err);
    console.error('[hikes/controller] Error stack:', err.stack);
    next(err);
  }
});

// GET /api/hikes/:id  (includes route + mapLocation loaded from file)
router.get('/:id', async (req, res, next) => {
  try {
    if (!repo?.getHikeById) return send501(res, 'getHikeById not implemented');
    const row = await repo.getHikeById(req.params.id);
    if (!row) return send404(res);

    console.log(`[GET /:id] Retrieved hike ${req.params.id}:`, {
      id: row.id,
      title: row.title || row.name,
      routePath: row.routePath,
      coverUrl: row.coverUrl,
      imageUrl: row.imageUrl
    });

    // Try to load route data, but don't fail if it's unavailable
    let route = [];
    let destinations = null;
    let mapMode = null;
    let mapLocation = null;

    if (row.routePath) {
      console.log(`[GET /:id] Found routePath, loading from: ${row.routePath}`);
      try {
        const routeData = await readRouteAny(row.routePath);
        console.log(`[GET /:id] readRouteAny returned:`, routeData ? { 
          hasPoints: !!routeData.points, 
          pointsLength: routeData.points?.length,
          hasDestinations: !!routeData.destinations,
          destinationsLength: routeData.destinations?.length,
          mapMode: routeData.mapMode,
          firstPoint: routeData.points?.[0]
        } : 'null');
        
        if (routeData) {
          route = routeData.points ?? [];
          destinations = routeData.destinations ?? null;
          mapMode = routeData.mapMode ?? null;
          mapLocation = routeData.mapLocation ?? null;
          console.log(`[GET /:id] Successfully loaded route:`, { 
            routeLength: route.length, 
            mapMode, 
            destinationsLength: destinations?.length,
            routeSample: route.slice(0, 2)
          });
        } else {
          console.warn(`[GET /:id] routeData was null from readRouteAny`);
        }
      } catch (routeError) {
        console.error(`[GET /:id] Error loading route for hike ${req.params.id}:`, routeError);
        // Continue with empty route data - hike can still be returned
      }
    } else {
      console.log(`[GET /:id] No routePath found in hike record`);
    }

    const responseData = { 
      ...row, 
      route, 
      destinations, 
      mapMode, 
      mapLocation 
    };
    
    console.log(`[GET /:id] Sending response:`, { 
      id: responseData.id,
      hasRoute: !!responseData.route && responseData.route.length > 0,
      routeLength: responseData.route?.length,
      hasDestinations: !!responseData.destinations,
      destinationsLength: responseData.destinations?.length,
      mapMode: responseData.mapMode,
      routePath: responseData.routePath
    });
    
    res.json(responseData);
  } catch (err) { 
    console.error(`[hikes/controller] Error in GET /:id for ${req.params.id}:`, err);
    next(err); 
  }
});

// POST /api/hikes  (multipart: cover image; route/mapLocation saved as JSON file)
router.post('/', upload.fields([{ name: 'cover' }]), async (req, res, next) => {
  try {
    if (!repo?.createHike) return send501(res, 'createHike not implemented');

    const body = req.body || {};

    // Map data comes as JSON strings in multipart form-data
    const routePoints = safeJsonParse(body.route, []);
    const mapLocation = safeJsonParse(body.mapLocation, null);
    const destinations = safeJsonParse(body.destinations, []);
    const mapMode = (body.mapMode === 'destinations') ? 'destinations' : 'simple';

    // Convert destinations to points format if in destinations mode
    let pointsForDistance = routePoints;
    if (mapMode === 'destinations' && Array.isArray(destinations) && destinations.length > 0) {
      // Extract [lat, lng] from destinations array for distance calculation
      // Filter out invalid destinations (missing or invalid lat/lng)
      const validDestinations = destinations.filter(d => d && typeof d.lat === 'number' && typeof d.lng === 'number' && !isNaN(d.lat) && !isNaN(d.lng));
      pointsForDistance = validDestinations.map(d => [d.lat, d.lng]);
    }

    const data = {
      title: body.name || body.title || 'Untitled hike',
      description: body.description || null,
      difficulty: body.difficulty || null,
      distance: (Array.isArray(pointsForDistance) && pointsForDistance.length > 1) ? `${totalRouteKm(pointsForDistance).toFixed(1)} km` : (body.distance || null),
      duration: body.duration || null,
      elevationGain: body.elevationGain || null,
      price: body.price ? parseInt(body.price, 10) : null,
      capacity: body.capacity ? parseInt(body.capacity, 10) : null,
      date: body.date ? new Date(body.date) : null,
      meetingTime: body.meetingTime || null,
      meetingPlace: body.meetingPlace || null,
      whatToBring: body.whatToBring || null,
      location: body.location || null,
      // Store multi-day information if provided
      isMultiDay: body.isMultiDay === 'true' || body.isMultiDay === true,
      durationDays: body.durationDays ? parseInt(body.durationDays, 10) : null,
    };

    // Handle cover upload (Spaces preferred, Firebase fallback)
    const adapters = req.app?.locals?.adapters || {};
    await handleFileUploads({
      files: req.files,
      data,
      storageAdapter: adapters.spacesStorage || adapters.firebaseStorage,
    });

    // Resolve guide from current user
    try {
      const firebaseUid = req.user?.firebaseUid || req.user?.id || null;
      if (!firebaseUid) return send401(res, 'You must be authenticated to create a hike');
      if (!usersRepo?.getCurrentUserProfile) {
        console.warn('[hikes/controller] usersRepo.getCurrentUserProfile not available');
        return send500(res, 'User repository not available');
      }

      const profile = await usersRepo.getCurrentUserProfile(
        firebaseUid,
        req.user ? { email: req.user.email, name: req.user.name, role: req.user.role } : null
      );

      if (!profile) return send404(res, 'User not found');
      if (!profile.guide?.id) return send400(res, 'You must have a guide profile to create hikes');
      data.guideId = profile.guide.id;
    } catch (e) {
      console.error('[hikes/controller] Error resolving guide:', e);
      return send500(res, 'Unable to resolve guide');
    }

    // Create hike in DB
    const created = await repo.createHike(data);

    // Save route JSON to Spaces (or local fallback) and store routePath in DB
    // Check for both simple mode (routePoints) and destinations mode (destinations)
    let routePath = null;
    
    try {
      const hasSimpleRoute = Array.isArray(routePoints) && routePoints.length > 0;
      const hasDestinationsRoute = mapMode === 'destinations' && Array.isArray(destinations) && destinations.length > 0;
      
      // Debug logging
      console.log('[hikes/controller] Route save check:', {
        hikeId: created.id,
        mapMode,
        mapModeType: typeof mapMode,
        hasSimpleRoute,
        hasDestinationsRoute,
        routePointsLength: Array.isArray(routePoints) ? routePoints.length : 0,
        routePointsType: Array.isArray(routePoints) ? 'array' : typeof routePoints,
        destinationsLength: Array.isArray(destinations) ? destinations.length : 0,
        destinationsType: Array.isArray(destinations) ? 'array' : typeof destinations,
        destinationsSample: Array.isArray(destinations) && destinations.length > 0 ? destinations[0] : null,
        pointsForDistanceLength: Array.isArray(pointsForDistance) ? pointsForDistance.length : 0,
        hasStorageAdapter: !!adapters.spacesStorage,
        storageAdapterType: adapters.spacesStorage ? typeof adapters.spacesStorage.uploadObject : 'none',
      });
      
      if (hasSimpleRoute || hasDestinationsRoute) {
        // For destinations mode, convert to points format for storage, but also preserve destinations
        // Important: In destinations mode, always save destinations array even if points conversion fails
        const pointsToStore = mapMode === 'destinations' ? pointsForDistance : routePoints;
        const destinationsToStore = mapMode === 'destinations' ? destinations : null;

        // In destinations mode, we must save if destinations exist (regardless of points)
        // In simple mode, we must save if points exist
        const shouldSave = (mapMode === 'destinations' && Array.isArray(destinationsToStore) && destinationsToStore.length > 0) ||
                           (mapMode === 'simple' && Array.isArray(pointsToStore) && pointsToStore.length > 0) ||
                           (Array.isArray(pointsToStore) && pointsToStore.length > 0);

        if (shouldSave && created?.id) {
          console.log('[hikes/controller] Saving route to storage:', {
            hikeId: created.id,
            mapMode,
            pointsCount: Array.isArray(pointsToStore) ? pointsToStore.length : 0,
            destinationsCount: Array.isArray(destinationsToStore) ? destinationsToStore.length : 0,
            hasStorageAdapter: !!adapters.spacesStorage,
          });

          routePath = await saveRouteToStorage({
            hikeId: created.id,
            mapLocation,
            points: pointsToStore,
            destinations: destinationsToStore,
            mapMode: mapMode,
            storageAdapter: adapters.spacesStorage || null,
          });

          console.log('[hikes/controller] Route saved, routePath:', routePath);

          if (repo?.updateHike && routePath) {
            await repo.updateHike(created.id, { routePath });
          }
        } else {
          console.warn('[hikes/controller] Route not saved - validation failed:', {
            mapMode,
            pointsToStoreLength: Array.isArray(pointsToStore) ? pointsToStore.length : 0,
            destinationsToStoreLength: Array.isArray(destinationsToStore) ? destinationsToStore.length : 0,
            shouldSave,
            hasCreatedId: !!created?.id,
          });
        }
      } else {
        console.warn('[hikes/controller] Route not saved - no valid route data:', {
          mapMode,
          routePointsLength: Array.isArray(routePoints) ? routePoints.length : 0,
          destinationsLength: Array.isArray(destinations) ? destinations.length : 0,
        });
      }
    } catch (routeSaveError) {
      console.error('[hikes/controller] Error saving route, continuing without route:', routeSaveError);
      // Continue without route path - hike is already created
    }

    // Prepare response data - use the data we already have instead of reading back
    // This avoids errors when trying to read immediately after upload to DigitalOcean Spaces
    let routeResponse = Array.isArray(routePoints) ? routePoints : [];
    let destinationsResponse = null;
    let mapModeResponse = null;
    
    // Use the data we just saved instead of reading it back
    if (routePath) {
      if (mapMode === 'destinations' && Array.isArray(destinations) && destinations.length > 0) {
        // Use destinations data we already have
        destinationsResponse = destinations;
        mapModeResponse = mapMode;
        // Use converted points for route display
        routeResponse = Array.isArray(pointsForDistance) ? pointsForDistance : [];
      } else if (Array.isArray(routePoints) && routePoints.length > 0) {
        // Use simple route points
        routeResponse = routePoints;
        mapModeResponse = 'simple';
      }
    }

    return res.status(201).json({
      ...created,
      routePath: routePath || created.routePath || null,
      route: routeResponse,
      destinations: destinationsResponse,
      mapMode: mapModeResponse,
      mapLocation: mapLocation ?? null,
    });
  } catch (err) { next(err); }
});

// PUT /api/hikes/:id  (multipart: cover image; optionally updates route/mapLocation JSON file)
router.put('/:id', upload.fields([{ name: 'cover' }]), async (req, res, next) => {
    console.log(`[PUT /:id] Updating hike ${req.params.id}`);
    
  try {
    if (!repo?.updateHike) return send501(res, 'updateHike not implemented');

    const body = req.body || {};
    const data = {};

    // Optional map data
    const routePoints = safeJsonParse(body.route, null);      // null means "not provided"
    const mapLocation = safeJsonParse(body.mapLocation, null);
    const destinations = safeJsonParse(body.destinations, null);  // null means "not provided"
    const mapMode = body.mapMode || null;

    // Convert destinations to points format if in destinations mode
    let pointsForDistance = routePoints;
    if (mapMode === 'destinations' && Array.isArray(destinations) && destinations.length > 0) {
      // Extract [lat, lng] from destinations array for distance calculation
      pointsForDistance = destinations
        .filter(d => d && typeof d.lat === 'number' && typeof d.lng === 'number')
        .map(d => [d.lat, d.lng]);
    }

    if (body.title) data.title = body.title;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.difficulty) data.difficulty = body.difficulty;
    if (Array.isArray(pointsForDistance) && pointsForDistance.length > 1) {
      data.distance = `${totalRouteKm(pointsForDistance).toFixed(1)} km`;
    } else if (body.distance) {
      data.distance = body.distance;
}

    if (body.elevationGain !== undefined) data.elevationGain = body.elevationGain || null;
    if (body.duration) data.duration = body.duration;
    // Store multi-day information if provided
    if (body.isMultiDay !== undefined) data.isMultiDay = body.isMultiDay === 'true' || body.isMultiDay === true;
    if (body.durationDays !== undefined) data.durationDays = body.durationDays ? parseInt(body.durationDays, 10) : null;
    if (body.price !== undefined) data.price = body.price ? parseInt(body.price, 10) : null;
    if (body.capacity !== undefined) data.capacity = body.capacity ? parseInt(body.capacity, 10) : null;
    if (body.date) data.date = new Date(body.date);
    if (body.meetingTime !== undefined) data.meetingTime = body.meetingTime || null;
    if (body.meetingPlace !== undefined) data.meetingPlace = body.meetingPlace || null;
    if (body.whatToBring !== undefined) data.whatToBring = body.whatToBring || null;
    if (body.location) data.location = body.location;

    // Get current hike to access old coverUrl before updating
    const currentHike = await repo.getHikeById(req.params.id);
    
    // Handle cover upload (Spaces preferred, Firebase fallback)
    const adapters = req.app?.locals?.adapters || {};
    
    // Pass old cover URL so it can be deleted if new one is uploaded
    if (currentHike?.coverUrl && req.files?.cover?.length > 0) {
      data.oldCoverUrl = currentHike.coverUrl;
    }
    
    await handleFileUploads({
      files: req.files,
      data,
      storageAdapter: adapters.spacesStorage || adapters.firebaseStorage,
    });

    // Verify ownership
    const firebaseUid = req.user?.firebaseUid || req.user?.id || null;
    if (!firebaseUid) return send401(res, 'You must be authenticated to update a hike');

    if (!usersRepo?.getCurrentUserProfile) {
      console.warn('[hikes/controller] usersRepo not available');
      return send500(res, 'User repository not available');
    }

    const profile = await usersRepo.getCurrentUserProfile(
      firebaseUid,
      req.user ? { email: req.user.email, name: req.user.name, role: req.user.role } : null
    );

    // Allow admins to edit any hike, or guides to edit their own hikes
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && !profile?.guide) return send403(res, 'Only guides and admins can edit hikes');

    const hike = await repo.getHikeById(req.params.id);
    if (!isAdmin && hike && hike.guideId !== profile.guide.id) return send403(res, 'You can only edit your own hikes');

    let updated = await repo.updateHike(req.params.id, data);
    
    console.log(`[PUT /:id] Hike updated successfully:`, {
      id: updated.id,
      title: updated.title || updated.name,
      coverUrl: updated.coverUrl,
      imageUrl: updated.imageUrl,
      hasCoverFile: !!req.files?.cover?.length
    });

    // If route was provided, save/overwrite route file and store routePath
    // Check for both simple mode (routePoints) and destinations mode (destinations)
    let routePath = updated.routePath;
    
    try {
      const hasSimpleRoute = Array.isArray(routePoints) && routePoints.length > 0;
      const hasDestinationsRoute = mapMode === 'destinations' && Array.isArray(destinations) && destinations.length > 0;
      
      console.log(`[PUT /:id] Route update check:`, {
        hasSimpleRoute,
        hasDestinationsRoute,
        mapMode,
        routePointsCount: routePoints?.length,
        destinationsCount: destinations?.length
      });
      
      if (hasSimpleRoute || hasDestinationsRoute) {
        // For destinations mode, convert to points format for storage, but also preserve destinations
        const pointsToStore = mapMode === 'destinations' ? pointsForDistance : routePoints;
        const destinationsToStore = mapMode === 'destinations' ? destinations : null;

        console.log(`[PUT /:id] Saving route to storage:`, { 
          hasSimpleRoute, 
          hasDestinationsRoute, 
          pointsCount: pointsToStore?.length, 
          destinationsCount: destinationsToStore?.length,
          pointsData: pointsToStore,
          destinationsData: destinationsToStore
        });
        
        routePath = await saveRouteToStorage({
          hikeId: req.params.id,
          mapLocation,
          points: pointsToStore,
          destinations: destinationsToStore,
          mapMode: mapMode,
          storageAdapter: adapters.spacesStorage || null,
        });
        
        console.log(`[PUT /:id] Route saved to: ${routePath}, updating database...`);
        updated = await repo.updateHike(req.params.id, { routePath });
        console.log(`[PUT /:id] Database updated, new routePath in DB:`, updated?.routePath);
      } else {
        console.log(`[PUT /:id] No route update provided, keeping existing routePath:`, routePath);
      }
    } catch (routeSaveError) {
      console.error('[hikes/controller] Error saving route in PUT:', routeSaveError);
      // Continue with existing routePath
    }

    // Prepare response - use saved data instead of reading back
    let routeResponse = Array.isArray(routePoints) ? routePoints : [];
    let destinationsResponse = null;
    let mapModeResponse = null;
    
    if (mapMode === 'destinations' && Array.isArray(destinations) && destinations.length > 0) {
      destinationsResponse = destinations;
      mapModeResponse = mapMode;
      routeResponse = Array.isArray(pointsForDistance) ? pointsForDistance : [];
    } else if (Array.isArray(routePoints) && routePoints.length > 0) {
      routeResponse = routePoints;
      mapModeResponse = 'simple';
    }

    // Try to load existing route data if no new route was provided
    if (!routeResponse.length && !destinationsResponse && routePath) {
      try {
        const routeData = await readRouteAny(routePath);
        if (routeData) {
          routeResponse = routeData.points ?? [];
          destinationsResponse = routeData.destinations ?? null;
          mapModeResponse = routeData.mapMode ?? null;
        }
      } catch (readError) {
        console.warn('[hikes/controller] Error reading existing route:', readError);
        // Continue with empty data
      }
    }

    const responseData = {
      ...updated,
      routePath: routePath || updated.routePath || null,
      route: routeResponse,
      destinations: destinationsResponse,
      mapMode: mapModeResponse,
      mapLocation: mapLocation ?? (updated.mapLocation ?? null),
    };
    
    console.log(`[PUT /:id] Sending response:`, {
      id: responseData.id,
      hasRoute: responseData.route?.length > 0,
      routeLength: responseData.route?.length,
      hasDestinations: responseData.destinations?.length > 0,
      destinationsLength: responseData.destinations?.length,
      mapMode: responseData.mapMode,
      routePath: responseData.routePath
    });

    return res.json(responseData);
  } catch (err) { next(err); }
});

// DELETE /api/hikes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    // Verify ownership (same logic as PUT endpoint)
    const firebaseUid = req.user?.firebaseUid || req.user?.id || null;
    if (!firebaseUid) return send401(res, 'You must be authenticated to delete a hike');

    if (!usersRepo?.getCurrentUserProfile) {
      console.warn('[hikes/controller] usersRepo not available');
      return send500(res, 'User repository not available');
    }

    const profile = await usersRepo.getCurrentUserProfile(
      firebaseUid,
      req.user ? { email: req.user.email, name: req.user.name, role: req.user.role } : null
    );

    // Allow admins to delete any hike, or guides to delete their own hikes
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && !profile?.guide) return send403(res, 'Only guides and admins can delete hikes');

    const hike = await repo.getHikeById(req.params.id);
    if (!hike) return send404(res, 'Hike not found');
    if (!isAdmin && hike.guideId !== profile.guide.id) return send403(res, 'You can only delete your own hikes');

    // Soft delete: set status to DELETED
    await prisma.hike.update({
      where: { id: req.params.id },
      data: { status: 'DELETED' }
    });
    
    // Remove all bookings (participants) from this hike
    await prisma.booking.deleteMany({ where: { hikeId: req.params.id } }).catch(() => {});
    
    // Keep reviews - they remain associated with the guide
    
    res.status(204).end();
  } catch (err) { next(err); }
});

/* ------------------- JOIN / LEAVE ------------------- */

// POST /api/hikes/:id/join
router.post('/:id/join', async (req, res, next) => {
  try {
    if (!bookingsRepo?.createBooking) return send501(res, 'createBooking not implemented');
    if (!req.user || req.user.role === 'visitor') return send401(res, 'You must be logged in to join a hike');

    const firebaseUid = req.user?.firebaseUid || req.user?.id;
    if (!firebaseUid) return send401(res, 'Unable to identify user');
    if (!usersRepo?.getUserByFirebaseUid) return send500(res, 'User repository not available');

    const user = await usersRepo.getUserByFirebaseUid(firebaseUid);
    if (!user) return send404(res, 'User not found');

    const hikeId = req.params.id;
    const status = (req.body?.status) || 'pending';
    const booking = await bookingsRepo.createBooking({ hikeId, status, userId: user.id });
    res.status(201).json(booking);
  } catch (err) {
    if (err.code === 'HIKE_FULL' || err.message === 'Hike is full') return send400(res, 'This hike is full');
    if (err.code === 'CANNOT_JOIN_OWN_HIKE' || (err.message?.includes('cannot join a hike that you created'))) return send400(res, 'You cannot join a hike that you created');
    console.error('[hikes] join error:', err);
    next(err);
  }
});

// DELETE /api/hikes/:id/join  (leave)
router.delete('/:id/join', async (req, res, next) => {
  try {
    if (!bookingsRepo?.deleteBookingForCurrentUserAndHike) return send501(res, 'deleteBookingForCurrentUserAndHike not implemented');
    if (!req.user || req.user.role === 'visitor') return send401(res, 'You must be logged in to leave a hike');

    const firebaseUid = req.user?.firebaseUid || req.user?.id;
    if (!firebaseUid) return send401(res, 'Unable to identify user');
    if (!usersRepo?.getUserByFirebaseUid) return send500(res, 'User repository not available');

    const user = await usersRepo.getUserByFirebaseUid(firebaseUid);
    if (!user) return send404(res, 'User not found');

    const hikeId = req.params.id;
    const deleted = await bookingsRepo.deleteBookingForCurrentUserAndHike(hikeId, user.id);
    if (!deleted) return send404(res, 'No booking found for this hike');

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[hikes] leave error:', err);
    next(err);
  }
});

module.exports = router;