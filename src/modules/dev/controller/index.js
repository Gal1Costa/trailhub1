/* eslint-disable */
const { Router } = require('express');
const { prisma } = require('../../../shared/prisma');

function getAdminAllowlist() {
  const raw = process.env.ADMIN_UIDS || "";
  return raw
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean);
}

function isAdminUid(firebaseUid) {
  if (!firebaseUid) return false;
  return getAdminAllowlist().includes(String(firebaseUid).trim());
}

const router = Router();

// GET /api/dev/enabled -> returns whether dev endpoints are available
router.get('/enabled', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ enabled: false });
    }
    return res.json({ enabled: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
