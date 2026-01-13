-- Ensure Review.hikeId uses ON DELETE SET NULL and fix old FK constraint name

-- Drop any old FK constraint that points from Review.hikeId to Hike.id
ALTER TABLE "Review"
  DROP CONSTRAINT IF EXISTS "Review_hikeld_fkey",
  DROP CONSTRAINT IF EXISTS "Review_hikeId_fkey";

-- Recreate the FK with the expected name and ON DELETE SET NULL
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_hikeId_fkey"
  FOREIGN KEY ("hikeId") REFERENCES "Hike"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

