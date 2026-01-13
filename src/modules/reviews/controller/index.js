/* eslint-disable */
const { Router } = require('express');
const { requireRole } = require('../../../app/roles.middleware');
const reviewsRepo = require('../repository');
const bookingsRepo = require('../../bookings/repository');
const hikesRepo = require('../../hikes/repository');
const { prisma } = require('../../../shared/prisma');

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

    // Verify hike is in the past
    const hike = await hikesRepo.getHikeById(String(hikeId));
    if (!hike) return res.status(404).json({ error: 'Hike not found' });
    
    // Check if hike is in the past by combining date and meetingTime (matching frontend logic)
    const hikeDate = hike.date || hike.createdAt || null;
    if (hikeDate) {
      const hikeDateObj = new Date(hikeDate);
      
      // If meetingTime exists, combine it with the date
      if (hike.meetingTime) {
        const [hours, minutes] = hike.meetingTime.split(':').map(Number);
        hikeDateObj.setHours(hours, minutes, 0, 0);
      } else {
        // If no time specified, set to end of day so hike is considered upcoming until end of day
        hikeDateObj.setHours(23, 59, 59, 999);
      }
      
      // Check if hike time has passed
      if (hikeDateObj >= new Date()) {
        return res.status(400).json({ error: 'You can only review hikes after they have occurred' });
      }
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
