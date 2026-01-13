/* eslint-disable */
const { Router } = require('express');
const { prisma } = require('../../../shared/prisma');
const { requireRole } = require('../../../app/roles.middleware');

const router = Router();
const { recordAudit, listAudits } = require('../audit');

// GET /api/admin/overview  -> returns counts used by admin dashboard
router.get('/overview', requireRole(['admin']), async (req, res, next) => {
  try {
    const users = await prisma.user.count();
    const hikes = await prisma.hike.count();
    const bookings = await prisma.booking.count();
    const guides = await prisma.guide.count();

    const agg = await prisma.review.aggregate({ _avg: { rating: true } });
    const averageRating = agg && agg._avg ? agg._avg.rating : null;

    res.json({ users, hikes, guides, bookings, averageRating });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users  -> list users for admin UI with guide/hiker profiles
router.get('/users', requireRole(['admin']), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(5, parseInt(req.query.pageSize, 10) || 20));
    const q = (req.query.q || '').trim();

    const where = q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    } : {};

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { 
          id: true, 
          email: true, 
          name: true, 
          role: true, 
          status: true,
          createdAt: true,
          guide: { select: { id: true, displayName: true, isVerified: true, isFeatured: true } },
          hikerProfile: { select: { id: true, location: true } }
        },
      }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit -> list audit logs
router.get('/audit', requireRole(['admin']), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(10, parseInt(req.query.pageSize, 10) || 50));
    const data = await listAudits({ page, pageSize });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/guides -> list all guides with user info
router.get('/guides', requireRole(['admin']), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(5, parseInt(req.query.pageSize, 10) || 20));
    const q = (req.query.q || '').trim();

    const where = q ? {
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ],
    } : {};

    const [total, items] = await Promise.all([
      prisma.guide.count({ where }),
      prisma.guide.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { 
          user: { select: { id: true, email: true, name: true, status: true } },
          _count: { select: { hikes: true, reviews: true } }
        },
      }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/guides/:id -> update guide fields like isVerified/isFeatured
router.patch('/guides/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const allowed = ['displayName', 'bio', 'isVerified', 'isFeatured', 'status'];
    const data = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        data[k] = body[k] === '' ? null : body[k];
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const updated = await prisma.guide.update({ where: { id }, data });
    try {
      await recordAudit({ 
        actorId: req.user?.id || null, 
        actorEmail: req.user?.email || null, 
        action: 'update_guide', 
        resource: 'guide', 
        resourceId: id, 
        details: data 
      });
    } catch (e) {}
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/me -> quick admin verification endpoint
router.get('/me', requireRole(['admin']), async (req, res, next) => {
  try {
    const email = req.user?.email || null;
    const uid = req.user?.firebaseUid || req.user?.id || null;
    return res.json({ admin: true, email, uid });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/hikes/:id  -> admin can update hike fields
router.patch('/hikes/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // Only allow specific fields to be updated by admin
    const allowed = ['title', 'description', 'difficulty', 'distance', 'duration', 'price', 'capacity', 'location', 'date', 'meetingTime', 'meetingPlace', 'elevationGain', 'whatToBring', 'coverUrl', 'routePath'];
    const data = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) data[k] = body[k] === '' ? null : body[k];
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields provided' });

    const updated = await prisma.hike.update({ where: { id }, data });
    try {
      await recordAudit({ actorId: req.user?.id || null, actorEmail: req.user?.email || null, action: 'update_hike', resource: 'hike', resourceId: id, details: data });
    } catch (e) {}
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/hikes -> paginated hikes for admin UI
router.get('/hikes', requireRole(['admin']), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(5, parseInt(req.query.pageSize, 10) || 20));
    const q = (req.query.q || '').trim();

    const where = q ? {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ],
    } : {};

    const [total, items] = await Promise.all([
      prisma.hike.count({ where }),
      prisma.hike.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { guide: { include: { user: true } }, _count: { select: { bookings: true } } },
      }),
    ]);

    // map items to a lighter shape expected by admin UI
    const mapped = items.map(i => ({
      id: i.id,
      title: i.title,
      name: i.title,
      guideName: i.guide?.user?.name || i.guide?.displayName || null,
      date: i.date,
      participantsCount: i._count?.bookings || 0,
      distance: i.distance,
    }));

    res.json({ items: mapped, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id -> admin can change role or basic user fields
router.patch('/users/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const allowed = ['role', 'name', 'email'];
    const data = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) data[k] = body[k] === '' ? null : body[k];
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields provided' });

    // Get existing user to check if role is changing
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: 'User not found' });

    // Update user
    const updated = await prisma.user.update({ where: { id }, data, select: { id: true, email: true, name: true, role: true, createdAt: true } });
    
    // If role changed, ensure correct profile exists
    if (data.role && existingUser.role !== data.role) {
      const newRole = data.role;
      const displayName = updated.name || existingUser.name || null;

      if (newRole === 'guide') {
        // Create or ensure Guide profile exists
        await prisma.guide.upsert({
          where: { userId: updated.id },
          update: {},
          create: { 
            userId: updated.id, 
            displayName: displayName, 
            status: 'ACTIVE' 
          }
        });
      } else if (newRole === 'hiker') {
        // Create or ensure HikerProfile exists
        await prisma.hikerProfile.upsert({
          where: { userId: updated.id },
          update: {},
          create: { 
            userId: updated.id, 
            displayName: displayName 
          }
        });
      }
    }

    try {
      await recordAudit({ actorId: req.user?.id || null, actorEmail: req.user?.email || null, action: 'update_user', resource: 'user', resourceId: id, details: data });
    } catch (e) {}
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/hikes/:id  -> admin may permanently remove a hike (and related records)
router.delete('/hikes/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    // remove dependent reviews and bookings first to avoid FK constraints
    await prisma.review.deleteMany({ where: { hikeId: id } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { hikeId: id } }).catch(() => {});
    await prisma.hike.delete({ where: { id } });
    try { await recordAudit({ actorId: req.user?.id || null, actorEmail: req.user?.email || null, action: 'delete_hike', resource: 'hike', resourceId: id }); } catch (e) {}
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id -> soft delete user by setting status='DELETED' and anonymizing
router.delete('/users/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Soft delete: set status to DELETED and anonymize email/name
    const anonymizedEmail = `deleted+${id}@example.invalid`;
    const anonymizedName = 'Deleted User';
    
    await prisma.user.update({
      where: { id },
      data: {
        status: 'DELETED',
        email: anonymizedEmail,
        name: anonymizedName
      }
    });
    
    try { 
      await recordAudit({ 
        actorId: req.user?.id || null, 
        actorEmail: req.user?.email || null, 
        action: 'soft_delete_user', 
        resource: 'user', 
        resourceId: id 
      }); 
    } catch (e) {}
    
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/guides/:id -> admin may remove a guide by guide id
router.delete('/guides/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    // delete reviews referencing this guide
    await prisma.review.deleteMany({ where: { guideId: id } }).catch(() => {});
    // delete the guide, hikes should be cascade-deleted if DB is configured
    await prisma.guide.delete({ where: { id } });
    try { await recordAudit({ actorId: req.user?.id || null, actorEmail: req.user?.email || null, action: 'delete_guide', resource: 'guide', resourceId: id }); } catch (e) {}
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;


