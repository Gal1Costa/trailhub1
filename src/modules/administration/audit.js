/* eslint-disable */
const { prisma } = require('../../shared/prisma');

async function recordAudit({ actorId = null, actorEmail = null, action, resource = null, resourceId = null, details = null }) {
  try {
    // Use raw SQL insert to avoid relying on generated prisma model
    const detailsStr = details ? JSON.stringify(details) : null;
    await prisma.$executeRawUnsafe(
      'INSERT INTO "AuditLog"("actorId","actorEmail","action","resource","resourceId","details","createdAt") VALUES ($1,$2,$3,$4,$5,$6,now())',
      actorId,
      actorEmail,
      action,
      resource,
      resourceId,
      detailsStr
    );
  } catch (err) {
    console.warn('[audit] Failed to record audit', err?.message || err);
  }
}

async function listAudits({ page = 1, pageSize = 50 } = {}) {
  const offset = (page - 1) * pageSize;
  const items = await prisma.$queryRawUnsafe(
    `SELECT id, "actorId", "actorEmail", action, resource, "resourceId", details, "createdAt" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT ${pageSize} OFFSET ${offset}`
  );
  const totalRes = await prisma.$queryRawUnsafe('SELECT count(*) as c FROM "AuditLog"');
  const total = totalRes && totalRes[0] ? Number(totalRes[0].c) : 0;
  return { items, total, page, pageSize };
}

module.exports = { recordAudit, listAudits };
