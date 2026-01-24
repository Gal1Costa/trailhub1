const { Router } = require('express');
const { requireRole } = require('../../../app/roles.middleware');
const { prisma } = require('../../../shared/prisma');
const usersRepo = require('../../users/repository');

const router = Router();

// GET /api/me - return current user's profile
router.get('/', async (req, res, next) => {
  try {
    const firebaseUid = req.user?.firebaseUid || req.user?.id || null;
    const userInfo = req.user ? { email: req.user.email, name: req.user.name, role: req.user.role } : null;
    const profile = await usersRepo.getCurrentUserProfile(firebaseUid, userInfo);
    return res.json(profile);
  } catch (err) {
    console.error('[me] Error fetching profile:', err);
    next(err);
  }
});

// DELETE /api/me - soft-delete current authenticated user
router.delete('/', requireRole(['hiker','guide','admin']), async (req, res, next) => {
  try {
    const authUser = req.user;
    if (!authUser || !authUser.id) return res.status(401).json({ error: 'Unauthorized' });

    // Look up the full user record in DB by id (id stored in req.user.id)
    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if already deleted using status field
    if (user.status === 'DELETED') {
      return res.status(410).json({ error: 'User already deleted' });
    }

    const now = new Date();

    // Soft-delete: mark as deleted, set timestamps
    // NOTE: We do NOT anonymize email/name so admins can still see who deleted their account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'DELETED',
        isDeleted: true,
        deletedAt: now,
        // Keep email and name intact for admin visibility
      },
    });

    // Soft delete related profiles (keep for admin visibility)
    await prisma.hikerProfile.deleteMany({ where: { userId: user.id } }).catch(() => {});
    // For guides, soft delete instead of hard delete so they remain visible in admin dashboard
    const guides = await prisma.guide.findMany({ where: { userId: user.id } });
    await prisma.guide.updateMany({ 
      where: { userId: user.id }, 
      data: { status: 'DELETED' }
    }).catch(() => {});

    // Soft-delete all hikes created by this guide (for admin dashboard visibility)
    for (const guide of guides) {
      await prisma.hike.updateMany({
        where: { guideId: guide.id },
        data: { status: 'DELETED' }
      }).catch(() => {});
    }

    // Record audit if available (best-effort)
    try {
      const { recordAudit } = require('../../administration/audit');
      await recordAudit({ actorId: user.id, actorEmail: null, action: 'self_delete', resource: 'user', resourceId: user.id });
    } catch (e) {}

    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/me/request-guide-role - hiker requests to become a guide
router.post('/request-guide-role', requireRole(['hiker']), async (req, res, next) => {
  try {
    const authUser = req.user;
    if (!authUser || !authUser.id) return res.status(401).json({ error: 'Unauthorized' });

    // Check if user already has a pending request
    const existingRequest = await prisma.auditLog.findFirst({
      where: {
        actorId: authUser.id,
        action: 'ROLE_REQUEST_GUIDE',
        details: 'PENDING'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }

    // Create role request using AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: authUser.id,
        actorEmail: authUser.email,
        action: 'ROLE_REQUEST_GUIDE',
        resource: 'user',
        resourceId: authUser.id,
        details: 'PENDING' // status stored in details field
      }
    });

    return res.json({ message: 'Guide role request submitted successfully' });
  } catch (err) {
    console.error('[me] Error requesting guide role:', err);
    next(err);
  }
});

// GET /api/me/role-request-status - check if user has pending role request
router.get('/role-request-status', requireRole(['hiker']), async (req, res, next) => {
  try {
    const authUser = req.user;
    if (!authUser || !authUser.id) return res.status(401).json({ error: 'Unauthorized' });

    const pendingRequest = await prisma.auditLog.findFirst({
      where: {
        actorId: authUser.id,
        action: 'ROLE_REQUEST_GUIDE',
        details: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ 
      hasPendingRequest: !!pendingRequest,
      request: pendingRequest
    });
  } catch (err) {
    console.error('[me] Error checking role request status:', err);
    next(err);
  }
});

module.exports = router;
