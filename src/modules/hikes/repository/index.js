/* eslint-disable */
const { prisma } = require('../../../shared/prisma');

function mapHike(hike) {
  if (!hike) return null;

  // Safely extract guide name - handle missing relations gracefully
  const guideName =
    hike.guide?.user?.name ||
    hike.guide?.displayName ||
    hike.guide?.user?.email ||
    null;

  const participantsCount =
    hike.participantsCount ??
    (hike._count?.bookings ?? 0) ??
    0;

  const capacity = hike.capacity ?? 0;

  // Choose a date field the UI can use
  const date = hike.date || hike.startDate || hike.createdAt;

  try {
    return {
      // keep all original fields in case something else uses them
      ...hike,

      // image URL alias used by frontend components
      imageUrl: hike.coverUrl || null,

      // fields the UI expects:
      id: hike.id,
      name: hike.title || hike.name || 'Untitled hike',
      location: hike.location || 'Unknown location',
      date,
      difficulty: hike.difficulty || 'n/a',
      participantsCount,
      capacity,
      isFull: capacity > 0 && participantsCount >= capacity,
      guideName,
    };
  } catch (error) {
    console.error('[mapHike] Error mapping hike:', error, 'hike:', hike?.id);
    return null;
  }
}

// List hikes for Explore page (with filters)
async function listHikes(filters = {}) {
  try {
    console.log("[listHikes] Starting with filters:", filters);
    
    // Verify Prisma client is available
    if (!prisma || !prisma.hike) {
      throw new Error("Prisma client not initialized properly");
    }
    
    const { search, difficulty, dateFrom, dateTo, priceFrom, priceTo, location } = filters;

    const and = [];

    // Difficulty enum: EASY / MODERATE / HARD
if (difficulty) {
  console.log("[listHikes] Difficulty filter received:", difficulty);
  
  // Split by comma if it's a comma-separated string
  const difficulties = String(difficulty).toLowerCase().split(',');
  
  // Create OR conditions for each valid difficulty
  const difficultyConditions = [];
  
  difficulties.forEach(diff => {
    const trimmed = diff.trim();
    if (trimmed === "easy") {
      difficultyConditions.push({ difficulty: "EASY" });
    } else if (trimmed === "moderate") {
      difficultyConditions.push({ difficulty: "MODERATE" });
    } else if (trimmed === "hard") {
      difficultyConditions.push({ difficulty: "HARD" });
    }
  });
  
  // Only add filter if we have valid conditions
  if (difficultyConditions.length > 0) {
    and.push({ OR: difficultyConditions });
  }
  
  console.log("[listHikes] Difficulty conditions:", difficultyConditions);
}

    // Price range
    if (priceFrom !== undefined && priceFrom !== null && !isNaN(priceFrom)) {
      and.push({ price: { gte: priceFrom } });
    }
    if (priceTo !== undefined && priceTo !== null && !isNaN(priceTo)) {
      and.push({ price: { lte: priceTo } });
    }

    // Date range (hike.date) - validate dates
    if (dateFrom && dateFrom instanceof Date && !isNaN(dateFrom.getTime())) {
      and.push({ date: { gte: dateFrom } });
    }
    if (dateTo && dateTo instanceof Date && !isNaN(dateTo.getTime())) {
      and.push({ date: { lte: dateTo } });
    }

    // Search: matches anything containing input across multiple fields
    if (search && String(search).trim()) {
      const q = String(search).trim();
      and.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { meetingPlace: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    // Location filter: must match location OR meetingPlace OR title
    if (location && String(location).trim()) {
      const q = String(location).trim();
      and.push({
        OR: [
          { location: { contains: q, mode: "insensitive" } },
          { meetingPlace: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    // Always exclude deleted hikes from Explore
    and.push({ status: { not: 'DELETED' } });
    const where = and.length ? { AND: and } : {};

    console.log("[listHikes] Prisma where clause:", JSON.stringify(where, null, 2));

    // Use a more defensive query - handle cases where guide might not have user
    let rows;
    try {
      rows = await prisma.hike.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          guide: { 
            include: { 
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            } 
          },
          _count: { select: { bookings: true } },
          bookings: {
            include: {
              user: {
                include: {
                  hikerProfile: true,
                  guide: true,
                },
              },
            },
          },
        },
      });
    } catch (queryError) {
      console.error("[listHikes] Prisma query error:", queryError);
      console.error("[listHikes] Query error code:", queryError.code);
      console.error("[listHikes] Query error meta:", JSON.stringify(queryError.meta, null, 2));
      throw queryError;
    }

    console.log(`[listHikes] Found ${rows.length} hikes from database`);

    // always return normalized shape - filter out nulls from mapHike
    const mapped = rows
      .map((h) => {
        try {
          return mapHike({
            ...h,
            participantsCount: h._count?.bookings ?? 0,
            participants: (h.bookings || []).map(b => ({
              id: b.user?.id,
              name: b.user?.name || b.user?.email || 'Participant',
              photoUrl: b.user?.hikerProfile?.photoUrl || null,
              role: b.user?.role || null,
              guideId: b.user?.guide?.id || null,
            })),
          });
        } catch (mapError) {
          console.error(`[listHikes] Error mapping hike ${h.id}:`, mapError);
          return null;
        }
      })
      .filter(h => h !== null);

    console.log(`[listHikes] Returning ${mapped.length} mapped hikes`);
    return mapped;
  } catch (error) {
    console.error("[listHikes] Fatal error:", error);
    console.error("[listHikes] Error name:", error.name);
    console.error("[listHikes] Error message:", error.message);
    console.error("[listHikes] Error stack:", error.stack);
    if (error.code) console.error("[listHikes] Error code:", error.code);
    if (error.meta) console.error("[listHikes] Error meta:", JSON.stringify(error.meta, null, 2));
    throw error;
  }
}


// Single hike details
async function getHikeById(id) {
  const h = await prisma.hike.findUnique({
    where: { id },
    include: {
      guide: { include: { user: true } },
      _count: { select: { bookings: true } },
      bookings: { include: { user: { include: { hikerProfile: true, guide: true } } } },
    },
  });

  if (!h) return null;

  return mapHike({
    ...h,
    participantsCount: h._count?.bookings ?? 0,
    participants: (h.bookings || []).map(b => ({
      id: b.user?.id,
      name: b.user?.name || b.user?.email || 'Participant',
      photoUrl: b.user?.hikerProfile?.photoUrl || null,
      role: b.user?.role || null,
      guideId: b.user?.guide?.id || null,
    })),
  });
}

// Create / update / delete keep raw Prisma data; frontend will still see mapped fields via list/get
async function createHike(data) {
  const h = await prisma.hike.create({ data });
  return mapHike(h);
}

async function updateHike(id, data) {
  console.log(`[updateHike] Updating hike ${id} with data:`, { 
    routePath: data.routePath,
    title: data.title,
    coverUrl: data.coverUrl,
    keys: Object.keys(data)
  });
  
  // Update the hike
  const updateResult = await prisma.hike.update({ where: { id }, data });
  console.log(`[updateHike] Prisma update result:`, { 
    id: updateResult.id,
    routePath: updateResult.routePath,
    coverUrl: updateResult.coverUrl
  });
  
  // Re-fetch with all includes to match getHikeById structure
  const h = await prisma.hike.findUnique({
    where: { id },
    include: {
      guide: { include: { user: true } },
      _count: { select: { bookings: true } },
      bookings: { include: { user: { include: { hikerProfile: true, guide: true } } } },
    },
  });

  if (!h) return null;

  const mapped = mapHike({
    ...h,
    participantsCount: h._count?.bookings ?? 0,
    participants: (h.bookings || []).map(b => ({
      id: b.user?.id,
      name: b.user?.name || b.user?.email || 'Participant',
      photoUrl: b.user?.hikerProfile?.photoUrl || null,
      role: b.user?.role || null,
      guideId: b.user?.guide?.id || null,
    })),
  });
  
  console.log(`[updateHike] Mapped result:`, { 
    id: mapped.id,
    routePath: mapped.routePath,
    imageUrl: mapped.imageUrl
  });
  
  return mapped;
}

async function deleteHike(id) {
  await prisma.booking.deleteMany({
    where: { hikeId: id }
  });

  return prisma.hike.delete({
    where: { id }
  });
}

module.exports = {
  listHikes,
  getHikeById,
  createHike,
  updateHike,
  deleteHike,
};