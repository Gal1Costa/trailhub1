/* eslint-disable */
/**
 * SIMPLIFIED ADMIN SYSTEM
 * 
 * Single source of truth: ADMIN_UIDS environment variable
 * Database role field is just a cache, not authoritative
 */

/**
 * Get admin UIDs from environment variable
 */
function getAdminUids() {
  const raw = process.env.ADMIN_UIDS || "";
  return raw
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
}

/**
 * Check if a Firebase UID is an admin
 * This is the ONLY source of truth for admin status
 */
function isAdmin(firebaseUid) {
  if (!firebaseUid) return false;
  const adminUids = getAdminUids();
  return adminUids.includes(String(firebaseUid).trim());
}

/**
 * Validate ADMIN_UIDS is set on startup
 */
function validateAdminConfig() {
  const adminUids = getAdminUids();
  if (adminUids.length === 0) {
    console.warn("[admin] WARNING: ADMIN_UIDS environment variable is not set or empty");
    console.warn("[admin] No admin users will be able to access admin endpoints");
  } else {
    console.log(`[admin] Admin UIDs configured: ${adminUids.length} admin(s)`);
  }
}

module.exports = {
  isAdmin,
  getAdminUids,
  validateAdminConfig,
};
