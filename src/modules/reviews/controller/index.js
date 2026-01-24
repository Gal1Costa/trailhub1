/* eslint-disable */
const { Router } = require('express');
const { requireRole } = require('../../../app/roles.middleware');
const reviewsRepo = require('../repository');
const bookingsRepo = require('../../bookings/repository');
const hikesRepo = require('../../hikes/repository');
const { prisma } = require('../../../shared/prisma');
const { canReviewHike } = require('../../../shared/dateUtils');

const router = Router();

// POST /api/reviews
router.post('/', requireRole(['hiker','guide','admin']), async (req, res, next) => {
  try {
    const user = req.user;
    const { hikeId, guideId, rating, comment, tags } = req.body;

    if (!user || !user.id) return res.status(401).json({ error: 'Unauthorized' });
    if (!hikeId || !guideId || !rating) return res.status(400).json({ error: 'hikeId, guideId and rating are required' });

    // Get the database user
    const firebaseUid = user?.firebaseUid || user?.id;
    if (!firebaseUid) return res.status(401).json({ error: 'Unauthorized' });
    const dbUser = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!dbUser) return res.status(401).json({ error: 'User not found' });

    // Verify booking exists for this user & hike
    const bookings = await bookingsRepo.listBookings({ hikeId, userId: dbUser.id });
    const hasBooking = (bookings || []).length > 0;
    if (!hasBooking) return res.status(403).json({ error: 'You must have joined this hike to review it' });

    // Verify hike exists
    const hike = await hikesRepo.getHikeById(String(hikeId));
    if (!hike) return res.status(404).json({ error: 'Hike not found' });
    
    // Check if hike date has occurred (timezone-safe calendar day comparison)
    const hikeDate = hike.date || hike.createdAt || null;
    
    // Debug logging for date comparison issue
    console.log('[reviews/post] Debug date comparison:', {
      hikeId: String(hikeId),
      hikeDateRaw: hikeDate,
      hikeDateType: typeof hikeDate,
      hikeDateValue: hikeDate ? new Date(hikeDate).toISOString() : null,
      hikeCreatedAt: hike.createdAt ? new Date(hike.createdAt).toISOString() : null,
      serverTime: new Date().toISOString(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canReview: canReviewHike(hikeDate),
    });
    
    if (!canReviewHike(hikeDate)) {
      console.error('[reviews/post] Review blocked - hike date check failed:', {
        hikeId: String(hikeId),
        hikeDate: hikeDate ? new Date(hikeDate).toISOString() : null,
        currentDate: new Date().toISOString(),
      });
      return res.status(400).json({ error: 'You can only review hikes after they have occurred' });
    }

    // Prevent duplicate review by same user for this hike
    const existing = await reviewsRepo.listReviews({ hikeId, userId: dbUser.id });
    if ((existing || []).length > 0) return res.status(409).json({ error: 'You have already reviewed this hike' });

    const data = {
      userId: dbUser.id,
      guideId: String(guideId),
      hikeId: String(hikeId),
      rating: Number(rating),
      comment: comment || null,
      tags: tags || [],
    };

    const created = await reviewsRepo.createReview(data);
    res.status(201).json(created);
  } catch (err) {
    console.error('[reviews/post] Error creating review', err);
    next(err);
  }
});

// GET /api/reviews/guide/:id
router.get('/guide/:id', requireRole(['visitor','hiker','guide','admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('[reviews/guide] Fetching reviews for guideId:', id);
    const rows = await reviewsRepo.listReviews({ guideId: id });
    console.log('[reviews/guide] Found', rows?.length || 0, 'reviews');
    res.status(200).json(rows || []);
  } catch (err) {
    console.error('[reviews/guide] Error listing reviews:', err.message);
    console.error('[reviews/guide] Error stack:', err.stack);
    next(err);
  }
});

// GET /api/reviews/hike/:id
router.get('/hike/:id', requireRole(['visitor','hiker','guide','admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await reviewsRepo.listReviews({ hikeId: id });
    res.status(200).json(rows);
  } catch (err) {
    console.error('[reviews/hike] Error listing reviews', err);
    next(err);
  }
});

// GET /api/reviews/user/me
router.get('/user/me', requireRole(['hiker','guide','admin']), async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Unauthorized' });

    // Get the database user
    const firebaseUid = user?.firebaseUid || user?.id;
    if (!firebaseUid) return res.status(401).json({ error: 'Unauthorized' });
    const dbUser = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!dbUser) return res.status(401).json({ error: 'User not found' });

    const rows = await reviewsRepo.listReviews({ userId: dbUser.id });
    res.status(200).json(rows);
  } catch (err) {
    console.error('[reviews/user/me] Error listing user reviews', err);
    next(err);
  }
});

module.exports = router;
