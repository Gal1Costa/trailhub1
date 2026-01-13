-- Make Review.hikeId nullable and change FK to ON DELETE SET NULL
-- Guarded so it can run even if older migrations haven't added hikeId yet.

DO $$
BEGIN
  -- Only run if column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Review'
      AND column_name = 'hikeId'
  ) THEN
    -- Allow NULLs
    EXECUTE 'ALTER TABLE "Review" ALTER COLUMN "hikeId" DROP NOT NULL';

    -- Drop existing FK if present
    EXECUTE 'ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_hikeId_fkey"';

    -- Recreate FK with ON DELETE SET NULL
    EXECUTE 'ALTER TABLE "Review"
      ADD CONSTRAINT "Review_hikeId_fkey"
      FOREIGN KEY ("hikeId") REFERENCES "Hike"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE';
  END IF;
END $$;

