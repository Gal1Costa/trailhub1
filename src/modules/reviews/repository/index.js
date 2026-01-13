/* eslint-disable */
const { prisma } = require('../../../shared/prisma');

// List reviews (optionally by guideId or userId)
async function listReviews(filter = {}) {
  try {
    // First try with all includes
    const reviews = await prisma.review.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }, 
        guide: {
          select: {
            id: true,
            displayName: true,
            bio: true,
            photoUrl: true,
            status: true, // Include status to avoid Prisma errors
          }
        },
        hike: {
          select: {
            id: true,
            title: true,
          }
        }
      },
    });
    return reviews;
  } catch (err) {
    console.error('[reviews/listReviews] Error fetching reviews with includes:', err.message);
    // Fallback: try with minimal includes
    try {
      const reviews = await prisma.review.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
        include: { 
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
      });
      return reviews;
    } catch (fallbackErr) {
      console.error('[reviews/listReviews] Error with fallback:', fallbackErr.message);
      // Last resort: return without any includes
      return await prisma.review.findMany({
        where: filter,
        orderBy: { createdAt: 'desc' },
      });
    }
  }
}

async function getReviewById(id) {
  try {
    return await prisma.review.findUnique({
      where: { id },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }, 
        guide: {
          select: {
            id: true,
            displayName: true,
            bio: true,
            photoUrl: true,
          }
        },
        hike: {
          select: {
            id: true,
            title: true,
          }
        }
      },
    });
  } catch (err) {
    console.error('[reviews/getReviewById] Error fetching review:', err);
    // Fallback: try without includes if there's an error
    return await prisma.review.findUnique({
      where: { id },
    });
  }
}

// expected: { userId, guideId, rating, comment? }
async function createReview(data) {
  return prisma.review.create({ data });
}

async function updateReview(id, data) {
  return prisma.review.update({ where: { id }, data });
}

async function deleteReview(id) {
  return prisma.review.delete({ where: { id } });
}

module.exports = {
  listReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
};
