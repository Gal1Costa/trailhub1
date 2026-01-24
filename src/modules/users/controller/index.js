/* eslint-disable */
// This file handles user-related API requests - like getting user profiles
const { Router } = require('express');
const { requireRole } = require('../../../app/roles.middleware');
const usersRepo = require('../repository');
const { prisma } = require('../../../shared/prisma');

const router = Router();
const { deleteUserByUid } = require('../../../adapters/firebase.auth');
const { recordAudit } = require('../../administration/audit');

// GET /api/users/me - return current user's profile (allows visitor access)
router.get('/me', async (req, res, next) => {
  try {
    const firebaseUid = req.user?.firebaseUid || req.user?.id || null;
    const userInfo = req.user ? { email: req.user.email, name: req.user.name, role: req.user.role } : null;
    const profile = await usersRepo.getCurrentUserProfile(firebaseUid, userInfo);
    return res.json(profile);
  } catch (err) {
    console.error('[users/me] Error fetching profile:', err);
    next(err);
  }
});

// POST /api/users/register - Register a new user after Firebase signup
// Note: This endpoint does NOT require authentication (public endpoint for new signups)
router.post('/register', async (req, res, next) => {
  try {
    console.log('[users/register] Received registration request:', { 
      firebaseUid: req.body.firebaseUid, 
      email: req.body.email, 
      role: req.body.role 
    });

    const { firebaseUid, email, name, role } = req.body;

    if (!firebaseUid || !email) {
      console.error('[users/register] Missing required fields:', { firebaseUid: !!firebaseUid, email: !!email });
      return res.status(400).json({ error: 'firebaseUid and email are required' });
    }

    // SECURITY: Block admin UIDs from registration (single source of truth)
    const { isAdmin } = require('../../../utils/admin');
    if (isAdmin(firebaseUid)) {
      return res.status(403).json({ 
        error: 'AdminUidBlocked',
        message: 'This account is registered as an administrator and cannot be registered through this endpoint.'
      });
    }

    // Validate role
    const validRoles = ['hiker', 'guide'];
    const userRole = validRoles.includes(role) ? role : 'hiker';

    console.log('[users/register] Creating/updating user with role:', userRole);
    const user = await usersRepo.createOrUpdateUser({
      firebaseUid,
      email,
      name,
      role: userRole,
    });

    console.log('[users/register] User created/updated successfully:', { id: user.id, email: user.email, role: user.role });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error('[users/register] User registration error:', err);
    console.error('[users/register] Error details:', {
      code: err.code,
      message: err.message,
      meta: err.meta,
    });
    if (err.code === 'P2002') {
      // Prisma unique constraint violation
      return res.status(409).json({ error: 'User with this email or Firebase UID already exists' });
    }
    next(err);
  }
});

// PATCH /api/users/profile - Update current user's profile
router.patch('/profile', requireRole(['hiker', 'guide', 'admin']), async (req, res, next) => {
  try {
    const firebaseUid = req.user?.firebaseUid || req.user?.id;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await usersRepo.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'hiker') {
      const updated = await usersRepo.updateHikerProfile(user.id, req.body);
      return res.json(updated);
    } else if (user.role === 'guide') {
      const updated = await usersRepo.updateGuideProfile(user.id, req.body);
      return res.json(updated);
    }

    return res.status(400).json({ error: 'Invalid user role' });
  } catch (err) {
    console.error('[users/profile] Update error:', err);
    console.error('[users/profile] Error details:', {
      message: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack,
    });
    
    // Return more specific error messages
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A record with this information already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    return res.status(500).json({ 
      error: err.message || 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

// Get a specific user's profile - need to be logged in (hiker, guide, or admin)
router.get('/:id', requireRole(['hiker','guide','admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const requester = req.user || null; // from auth middleware

    const user = await usersRepo.getUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch bookings for this user so viewers can see joined hikes
    let bookings = [];
    try {
      bookings = await prisma.booking.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { 
          hike: {
            include: {
              _count: { select: { bookings: true } },
            },
          },
        },
      });
      // Add participantsCount to hike objects
      bookings = bookings.map((b) => ({
        ...b,
        hike: b.hike ? {
          ...b.hike,
          participantsCount: b.hike._count?.bookings ?? 0,
        } : null,
      }));
    } catch (bErr) {
      console.warn('[users/:id] Failed to load bookings for user', user.id, bErr.message || bErr);
      bookings = [];
    }

    // Build profile object that includes public information and bookings
    const profile = {
      ...user,
      bookings,
    };

    // Admin check: use isAdmin utility (single source of truth)
    const { isAdmin: checkIsAdmin } = require('../../../utils/admin');
    const isAdmin = requester && checkIsAdmin(requester.firebaseUid);
    const isOwner = requester && requester.firebaseUid && requester.firebaseUid === user.firebaseUid;

    // Hide sensitive fields for non-owners (e.g. email, firebaseUid)
    if (!isAdmin && !isOwner) {
      const { email, firebaseUid, ...publicProfile } = profile;
      return res.json(publicProfile);
    }

    return res.json(profile);
  } catch (err) {
    console.error('[users/:id] Error fetching user by id:', err);
    next(err);
  }
});

// Export the router after all routes are defined

// DELETE /api/users/me - forwarded to /api/me (use soft-delete there)
// To avoid duplicate hard-delete logic we forward clients to the canonical
// endpoint `/api/me`. This returns a 307 so clients that honor redirects
// will repeat the DELETE against `/api/me`. Frontend should call `/api/me`.
router.delete('/me', requireRole(['hiker','guide','admin']), async (req, res) => {
  // Return a redirect to the canonical endpoint which performs soft-delete
  return res.redirect(307, '/api/me');
});

module.exports = router;
