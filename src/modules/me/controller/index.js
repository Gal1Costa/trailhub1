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

    const anonEmail = `deleted+${user.id}@example.invalid`;
    const now = new Date();

    // Soft-delete: mark as deleted, set timestamps, anonymize PII
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'DELETED',
        isDeleted: true,
        deletedAt: now,
        anonymizedAt: now,
        email: anonEmail,
        name: 'Deleted User',
      },
    });

    // Optionally remove related sensitive profiles
    await prisma.hikerProfile.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.guide.deleteMany({ where: { userId: user.id } }).catch(() => {});

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

module.exports = router;
