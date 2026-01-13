/* eslint-disable */
// src/app/auth.middleware.js
const { verifyIdToken } = require("../adapters/firebase.auth");
const { prisma } = require("../shared/prisma");
const { isAdmin } = require("../utils/admin");

async function ensureNotDeletedByUserRecord(user) {
  if (user && user.status === "DELETED") {
    return { blocked: true, response: { status: 401, body: { error: "Account deleted" } } };
  }
  return { blocked: false };
}

/**
 * SIMPLIFIED AUTH RULES:
 * - Admin status determined SOLELY by ADMIN_UIDS environment variable
 * - Database role field is just a cache (auto-updated on login)
 * - x-dev-user is ONLY honored if DEV_AUTH=1
 */
async function authMiddleware(req, res, next) {
  try {
    // -----------------------------------------
    // 0) DEV HEADER (ONLY if explicitly enabled)
    // -----------------------------------------
    const devHeader = req.headers["x-dev-user"];
    const devAuthEnabled = process.env.DEV_AUTH === "1";

    if (devAuthEnabled && devHeader) {
      try {
        const parsed = JSON.parse(devHeader);
        const email = parsed.email || null;

        // dev header may request admin, but we still enforce allowlist
        const requestedRole = parsed.role || "hiker";
        const firebaseUid = parsed.firebaseUid || null;
        const role = requestedRole === "admin" && isAdmin(firebaseUid) ? "admin" : "hiker";

        // Optional: block deleted users (lookup by id/firebaseUid/email)
        const ors = [
          parsed.id ? { id: parsed.id } : null,
          parsed.firebaseUid ? { firebaseUid: parsed.firebaseUid } : null,
          email ? { email } : null,
        ].filter(Boolean);

        if (ors.length) {
          const found = await prisma.user.findFirst({ where: { OR: ors } }).catch(() => null);
          const deletedCheck = await ensureNotDeletedByUserRecord(found);
          if (deletedCheck.blocked) return res.status(deletedCheck.response.status).json(deletedCheck.response.body);
        }

        req.user = {
          id: parsed.id || "dev-user",
          firebaseUid: parsed.firebaseUid || null,
          email,
          role,
        };
        return next();
      } catch (e) {
        // ignore invalid dev header
      }
    }

    // -----------------------------------------
    // 1) TOKEN FLOW
    // -----------------------------------------
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      req.user = { role: "visitor" };
      return next();
    }

    const data = await verifyIdToken(token);
    if (!data) {
      req.user = { role: "visitor" };
      return next();
    }

    const email = data.email || null;

    // Find user by firebaseUid OR email
    let user = null;
    try {
      const ors = [{ firebaseUid: data.uid }];
      if (email) ors.push({ email });
      user = await prisma.user.findFirst({ where: { OR: ors } });
    } catch (e) {
      user = null;
    }

    const firebaseUid = data.uid;

    // Determine admin status from ADMIN_UIDS (single source of truth)
    const isUserAdmin = isAdmin(firebaseUid);

    // Create missing user or update existing user
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            firebaseUid: data.uid,
            email,
            name: data.name || null,
            role: isUserAdmin ? "admin" : "hiker", // Cache admin status in DB
            status: "ACTIVE",
          },
        });
      } catch (e) {
        // fallback identity if DB create fails
        req.user = { 
          id: data.uid, 
          firebaseUid: data.uid, 
          email, 
          role: isUserAdmin ? "admin" : "hiker" 
        };
        return next();
      }
    } else {
      // Auto-update DB role cache if admin status changed
      const currentRole = user.role || "hiker";
      const shouldBeAdmin = isUserAdmin;
      const isCurrentlyAdmin = currentRole === "admin";

      if (shouldBeAdmin !== isCurrentlyAdmin) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: shouldBeAdmin ? "admin" : "hiker" },
          });
          user.role = shouldBeAdmin ? "admin" : "hiker";
        } catch (e) {
          // Non-fatal: continue with current role
        }
      }
    }

    // Block deleted
    const deletedCheck = await ensureNotDeletedByUserRecord(user);
    if (deletedCheck.blocked) return res.status(deletedCheck.response.status).json(deletedCheck.response.body);

    // Role is determined by isAdmin() check, DB role is just cache
    const role = isUserAdmin ? "admin" : (user.role || "hiker");

    req.user = {
      id: user.id,
      firebaseUid: data.uid,
      email,
      role,
    };

    return next();
  } catch (err) {
    req.user = { role: "visitor" };
    return next();
  }
}

module.exports = { authMiddleware };