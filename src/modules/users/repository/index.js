/* eslint-disable */
const { prisma } = require("../../../shared/prisma");

function normalizeRole(input) {
  const r = String(input || "").toLowerCase();
  if (r === "guide") return "guide";
  return "hiker"; // default + only allowed roles from client
}

// Find any existing user or create a demo one (dev only)
async function getOrCreateDemoUser() {
  const existing = await prisma.user.findFirst();
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: "demo@local",
      name: "Demo User",
      role: "hiker",
      status: "ACTIVE",
    },
  });
}

/**
 * Create or update a user from Firebase auth data.
 * NOTE: Admin status is determined by ADMIN_UIDS env var, not here.
 * This function only handles hiker/guide roles from client registration.
 */
async function createOrUpdateUser({ firebaseUid, email, name, role = "hiker" }) {
  if (!firebaseUid || !email) throw new Error("firebaseUid and email are required");

  const requestedRole = normalizeRole(role);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ firebaseUid }, { email }] },
  });

  if (existing) {
    if (existing.status === "DELETED") {
      const err = new Error("Account deleted");
      err.statusCode = 401;
      throw err;
    }

    // Use requested role (admin status is handled by auth middleware)
    const nextRole = requestedRole;

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        firebaseUid,
        email,
        name: name || existing.name,
        role: nextRole,
        // do NOT touch status here
      },
    });

    // If role changed between guide/hiker, ensure correct profile exists
    if (existing.role !== nextRole) {
      if (nextRole === "guide") {
        await prisma.guide.upsert({
          where: { userId: updated.id },
          update: {},
          create: { userId: updated.id, displayName: name || updated.name || null, status: "ACTIVE" },
        });
      } else if (nextRole === "hiker") {
        await prisma.hikerProfile.upsert({
          where: { userId: updated.id },
          update: {},
          create: { userId: updated.id, displayName: name || updated.name || null },
        });
      }
    }

    return updated;
  }

  // New user: ALWAYS create as hiker or guide only (never admin)
  const user = await prisma.user.create({
    data: {
      firebaseUid,
      email,
      name: name || null,
      role: requestedRole,
      status: "ACTIVE",
    },
  });

  if (requestedRole === "guide") {
    await prisma.guide.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: name || null, status: "ACTIVE" },
    });
  } else {
    await prisma.hikerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: name || null },
    });
  }

  return user;
}

async function getUserByFirebaseUid(firebaseUid) {
  if (!firebaseUid) return null;
  return prisma.user.findUnique({ where: { firebaseUid } });
}

async function getUserById(userId) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { hikerProfile: true, guide: true },
  });
  if (!user) return null;
  
  // Block deleted users
  if (user.status === "DELETED") {
    const err = new Error("Account deleted");
    err.statusCode = 401;
    throw err;
  }

  let createdHikes = [];
  if (user.role === "guide" && user.guide) {
    createdHikes = await prisma.hike.findMany({
      where: { guideId: user.guide.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bookings: true } } },
    });
  }

  return {
    ...user,
    ...(user.role === "guide" && {
      createdHikes: createdHikes.map((h) => ({ ...h, participantsCount: h._count?.bookings ?? 0 })),
    }),
  };
}

async function getCurrentUserProfile(firebaseUid, userInfo = null) {
  let user = null;

  if (firebaseUid) user = await getUserByFirebaseUid(firebaseUid);

  // Check if user is deleted
  if (user && user.status === "DELETED") {
    const err = new Error("Account deleted");
    err.statusCode = 401;
    throw err;
  }

  // Create user if missing and we have auth info
  if (!user && firebaseUid && userInfo) {
    user = await createOrUpdateUser({
      firebaseUid,
      email: userInfo.email || "unknown@example.com",
      name: userInfo.name || null,
      role: userInfo.role || "hiker",
    });
  }

  // If firebaseUid exists but user not found and no userInfo, return 404
  if (!user && firebaseUid) {
    const err = new Error("User not found in database. Please register first.");
    err.statusCode = 404;
    throw err;
  }

  // No firebaseUid => dev-only fallback
  if (!user && !firebaseUid) user = await getOrCreateDemoUser();

  if (!user) {
    const err = new Error("User not found in database. Please register first.");
    err.statusCode = 404;
    throw err;
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { hike: true },
  });

  let hikerProfile = null;
  if (user.role === "hiker") {
    hikerProfile = await prisma.hikerProfile.findUnique({ where: { userId: user.id } });
  }

  let guideProfile = null;
  let createdHikes = [];
  if (user.role === "guide") {
    guideProfile = await prisma.guide.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (guideProfile) {
      createdHikes = await prisma.hike.findMany({
        where: { guideId: guideProfile.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { bookings: true } } },
      });
    }
  }

  return {
    ...user,
    bookings,
    ...(user.role === "hiker" && { hikerProfile }),
    ...(user.role === "guide" && {
      guide: guideProfile ? {
        ...guideProfile,
        id: guideProfile.id, // Ensure id is explicitly set
      } : null,
      createdHikes: createdHikes.map((h) => ({ ...h, participantsCount: h._count?.bookings ?? 0 })),
    }),
  };
}

async function updateHikerProfile(userId, data) {
  const { name, bio, location, displayName, fitnessLevel } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { hikerProfile: true },
  });

  if (!user || user.role !== "hiker") throw new Error("User is not a hiker");
  if (user.status === "DELETED") {
    const err = new Error("Account deleted");
    err.statusCode = 401;
    throw err;
  }

  if (name && name.trim() && name.trim() !== user.name) {
    await prisma.user.update({ where: { id: userId }, data: { name: name.trim() } });
  }

  const updateData = {};
  if (bio !== undefined) updateData.bio = bio || null;
  if (location !== undefined) updateData.location = location || null;
  if (displayName !== undefined) updateData.displayName = displayName || null;
  if (fitnessLevel !== undefined) updateData.fitnessLevel = fitnessLevel || null;

  return prisma.hikerProfile.upsert({
    where: { userId },
    update: Object.keys(updateData).length ? updateData : {},
    create: {
      userId,
      bio: bio || null,
      location: location || null,
      displayName: displayName || name || null,
      fitnessLevel: fitnessLevel || null,
    },
  });
}

async function updateGuideProfile(userId, data) {
  const { name, bio, location, displayName } = data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { guide: true },
  });

  if (!user || user.role !== "guide") throw new Error("User is not a guide");
  if (user.status === "DELETED") {
    const err = new Error("Account deleted");
    err.statusCode = 401;
    throw err;
  }

  if (name && name.trim() && name.trim() !== user.name) {
    await prisma.user.update({ where: { id: userId }, data: { name: name.trim() } });
  }

  const updateData = {};
  if (bio !== undefined) updateData.bio = bio || null;
  if (location !== undefined) updateData.location = location || null;
  if (displayName !== undefined) updateData.displayName = displayName || null;

  return prisma.guide.upsert({
    where: { userId },
    update: Object.keys(updateData).length ? updateData : {},
    create: {
      userId,
      bio: bio || null,
      location: location || null,
      displayName: displayName || name || null,
      status: "ACTIVE",
    },
  });
}

module.exports = {
  getOrCreateDemoUser,
  getCurrentUserProfile,
  createOrUpdateUser,
  getUserById,
  getUserByFirebaseUid,
  updateHikerProfile,
  updateGuideProfile,
};
