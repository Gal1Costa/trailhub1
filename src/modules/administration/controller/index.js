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

// GET /api/admin/analytics  -> returns time-series analytics data
router.get('/analytics', requireRole(['admin']), async (req, res, next) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // This month counts
    const [usersThisMonth, hikesThisMonth, bookingsThisMonth, guidesThisMonth, hikersThisMonth] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startOfThisMonth } } }),
      prisma.hike.count({ where: { createdAt: { gte: startOfThisMonth } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfThisMonth } } }),
      prisma.guide.count({ where: { createdAt: { gte: startOfThisMonth } } }),
      prisma.user.count({ where: { role: 'hiker', createdAt: { gte: startOfThisMonth } } }),
    ]);

    // Last month counts
    const [usersLastMonth, hikesLastMonth, bookingsLastMonth, guidesLastMonth, hikersLastMonth] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.hike.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.guide.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      prisma.user.count({ where: { role: 'hiker', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    ]);

    // Daily data for the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dailyData = [];
    for (let i = 0; i < 30; i++) {
      const dayStart = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      
      const [users, hikes, bookings, guides, hikers] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.hike.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.booking.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.guide.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.user.count({ where: { role: 'hiker', createdAt: { gte: dayStart, lte: dayEnd } } }),
      ]);

      dailyData.push({
        date: dayStart.toISOString().split('T')[0],
        users,
        hikes,
        bookings,
        guides,
        hikers,
      });
    }

    res.json({
      thisMonth: { 
        users: usersThisMonth, 
        hikes: hikesThisMonth, 
        bookings: bookingsThisMonth,
        guides: guidesThisMonth,
        hikers: hikersThisMonth
      },
      lastMonth: { 
        users: usersLastMonth, 
        hikes: hikesLastMonth, 
        bookings: bookingsLastMonth,
        guides: guidesLastMonth,
        hikers: hikersLastMonth
      },
      dailyData,
    });
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

    const where = {
      role: { not: 'admin' }, // Exclude admin users from the list
      ...(q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    };

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

    // Always show all hikes, including DELETED
    let where = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ];
    }

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
      status: i.status || 'ACTIVE',
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

// GET /api/admin/hikes/:id/participants -> get list of participants (bookings) for a hike
router.get('/hikes/:id/participants', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const bookings = await prisma.booking.findMany({
      where: { hikeId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const participants = bookings.map(b => ({
      id: b.id,
      bookingId: b.id,
      userId: b.user?.id || null,
      name: b.user?.name || 'Unknown',
      email: b.user?.email || 'N/A',
      role: b.user?.role || null,
      status: b.status,
      createdAt: b.createdAt,
    }));

    res.json({ participants });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/bookings/:id -> admin can remove a booking (participant from hike)
router.delete('/bookings/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.booking.delete({ where: { id } });
    try {
      await recordAudit({ actorId: req.user?.id || null, actorEmail: req.user?.email || null, action: 'delete_booking', resource: 'booking', resourceId: id });
    } catch (e) {}
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/hikes/:id  -> soft delete hike (set status to DELETED)
router.delete('/hikes/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Soft delete hike: set status to DELETED
    await prisma.hike.update({
      where: { id },
      data: { status: 'DELETED' }
    });
    
    // Remove all bookings (participants) from this hike
    await prisma.booking.deleteMany({ where: { hikeId: id } }).catch(() => {});
    
    // Keep reviews - they remain associated with the guide
    
    try { await recordAudit({ actorId: req.user?.id || null, actorEmail: req.user?.email || null, action: 'soft_delete_hike', resource: 'hike', resourceId: id }); } catch (e) {}
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id -> soft delete user by setting status='DELETED' and anonymizing
router.delete('/users/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Soft delete: set status to DELETED (keep email and name for admin visibility)
    await prisma.user.update({
      where: { id },
      data: {
        status: 'DELETED'
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
    
    // Get the guide to find the associated user
    const guide = await prisma.guide.findUnique({ 
      where: { id },
      include: { user: true }
    });
    
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }
    
    // Atomic cascading soft-delete for guide, hikes, and bookings
    await prisma.$transaction(async (tx) => {
      // Soft delete user
      if (guide.userId) {
        await tx.user.update({
          where: { id: guide.userId },
          data: { status: 'DELETED' }
        });
      }
      // Soft delete guide profile
      await tx.guide.update({
        where: { id },
        data: { status: 'DELETED' }
      });
      // Find all hikes by this guide
      const hikes = await tx.hike.findMany({ where: { guideId: id } });
      // Soft delete all hikes
      await tx.hike.updateMany({ where: { guideId: id }, data: { status: 'DELETED' } });
      // Remove all bookings for these hikes
      const hikeIds = hikes.map(h => h.id);
      if (hikeIds.length > 0) {
        await tx.booking.deleteMany({ where: { hikeId: { in: hikeIds } } });
      }
    });
    
    try { 
      await recordAudit({ 
        actorId: req.user?.id || null, 
        actorEmail: req.user?.email || null, 
        action: 'soft_delete_guide', 
        resource: 'guide', 
        resourceId: id 
      }); 
    } catch (e) {}
    
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/role-requests -> get all pending role requests
router.get('/role-requests', requireRole(['admin']), async (req, res, next) => {
  try {
    const requests = await prisma.auditLog.findMany({
      where: {
        action: 'ROLE_REQUEST_GUIDE',
        details: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get user details for each request
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const user = await prisma.user.findUnique({
          where: { id: request.actorId },
          include: { hikerProfile: true }
        });
        return {
          ...request,
          user
        };
      })
    );

    return res.json(requestsWithUsers);
  } catch (err) {
    console.error('[admin] Error fetching role requests:', err);
    next(err);
  }
});

// POST /api/admin/role-requests/:requestId/approve -> approve a role request
router.post('/role-requests/:requestId/approve', requireRole(['admin']), async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const request = await prisma.auditLog.findUnique({
      where: { id: requestId }
    });

    if (!request || request.action !== 'ROLE_REQUEST_GUIDE') {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.details !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Update user role to guide
    await prisma.user.update({
      where: { id: request.actorId },
      data: { role: 'guide' }
    });

    // Create guide profile
    await prisma.guide.create({
      data: {
        userId: request.actorId,
        bio: '',
        status: 'ACTIVE'
      }
    });

    // Update the request status
    await prisma.auditLog.update({
      where: { id: requestId },
      data: { 
        details: `APPROVED_BY:${req.user?.id || 'admin'}` 
      }
    });

    // Record audit
    try {
      await recordAudit({
        actorId: req.user?.id || null,
        actorEmail: req.user?.email || null,
        action: 'approve_guide_request',
        resource: 'user',
        resourceId: request.actorId
      });
    } catch (e) {}

    return res.json({ message: 'Request approved successfully' });
  } catch (err) {
    console.error('[admin] Error approving role request:', err);
    next(err);
  }
});

// POST /api/admin/role-requests/:requestId/reject -> reject a role request
router.post('/role-requests/:requestId/reject', requireRole(['admin']), async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const request = await prisma.auditLog.findUnique({
      where: { id: requestId }
    });

    if (!request || request.action !== 'ROLE_REQUEST_GUIDE') {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.details !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Update the request status
    await prisma.auditLog.update({
      where: { id: requestId },
      data: { 
        details: `REJECTED_BY:${req.user?.id || 'admin'}` 
      }
    });

    // Record audit
    try {
      await recordAudit({
        actorId: req.user?.id || null,
        actorEmail: req.user?.email || null,
        action: 'reject_guide_request',
        resource: 'user',
        resourceId: request.actorId
      });
    } catch (e) {}

    return res.json({ message: 'Request rejected successfully' });
  } catch (err) {
    console.error('[admin] Error rejecting role request:', err);
    next(err);
  }
});

module.exports = router;


