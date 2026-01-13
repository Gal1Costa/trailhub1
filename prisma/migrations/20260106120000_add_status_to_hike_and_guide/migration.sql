-- Add missing status columns for Guide and Hike to align with prisma/schema.prisma

-- Guide.status (required string)
ALTER TABLE "Guide"
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Hike.status (required string)
ALTER TABLE "Hike"
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Ensure existing rows get a value
UPDATE "Guide" SET "status" = 'ACTIVE' WHERE "status" IS NULL;
UPDATE "Hike" SET "status" = 'ACTIVE' WHERE "status" IS NULL;
