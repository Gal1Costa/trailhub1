/* eslint-disable */
const { Router } = require('express');
const { requireRole } = require('../../../app/roles.middleware');
const { isAdmin } = require('../../../utils/admin');

const router = Router();

/**
 * GET /api/auth/check-admin
 * Test endpoint to verify admin status
 * Returns whether the current user is an admin based on ADMIN_UIDS
 */
router.get('/check-admin', requireRole(['visitor','hiker','guide','admin']), async (req, res) => {
  const firebaseUid = req.user?.firebaseUid || null;
  const adminStatus = isAdmin(firebaseUid);
  
  res.json({
    isAdmin: adminStatus,
    firebaseUid,
    role: req.user?.role || 'visitor',
    message: adminStatus 
      ? 'User is an admin (UID is in ADMIN_UIDS)' 
      : 'User is not an admin (UID not in ADMIN_UIDS)'
  });
});

module.exports = router;
