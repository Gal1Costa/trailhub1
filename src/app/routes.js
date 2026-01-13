/* eslint-disable */
const { Router } = require('express');
const router = Router();

// Mount module routers (controllers)
router.use('/api/hikes', require('../modules/hikes/controller'));
router.use('/api/users', require('../modules/users/controller'));
router.use('/api/guides', require('../modules/guides/controller'));
router.use('/api/bookings', require('../modules/bookings/controller'));
router.use('/api/reviews', require('../modules/reviews/controller'));
router.use('/api/admin', require('../modules/administration/controller'));
router.use('/api/admin/analytics', require('../modules/analytics/controller'));
router.use('/api/identity', require('../modules/identity/controller'));
// mount /api/me controller for self-operations
router.use('/api/me', require('../modules/me/controller'));
// mount /api/auth for auth-related endpoints
router.use('/api/auth', require('../modules/auth/controller'));

// Mount dev-only routes (only in development)
if (process.env.NODE_ENV === 'development') {
  try {
    router.use('/api/dev', require('../modules/dev/controller'));
  } catch (e) {
    console.warn('Dev routes not available:', e.message || e);
  }
}

// other module routers can be mounted similarly when ready
// e.g. router.use('/api/bookings', require('../modules/bookings/controller'));

// Backwards-compatible profile endpoint (legacy - /api/me is now handled by me controller)
const usersRepo = require('../modules/users/repository');

async function handleProfile(req, res, next) {
  try {
    if (!usersRepo?.getCurrentUserProfile) return res.status(501).json({ error: 'getCurrentUserProfile not implemented' });
    const firebaseUid = req.user?.firebaseUid || req.user?.id || null;
    const userInfo = req.user ? { email: req.user.email, name: req.user.name, role: req.user.role } : null;
    if (!firebaseUid && req.user?.role !== 'visitor') return res.status(401).json({ error: 'Unable to identify user' });
    const profile = await usersRepo.getCurrentUserProfile(firebaseUid, userInfo);
    res.json(profile);
  } catch (err) {
    console.error('[routes] handleProfile error', err);
    next(err);
  }
}

// Legacy /api/profile endpoint (kept for backwards compatibility)
router.get('/api/profile', handleProfile);

module.exports = router;
