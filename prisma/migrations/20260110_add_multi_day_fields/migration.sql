-- AlterTable
ALTER TABLE "Hike" ADD COLUMN "durationDays" INTEGER,
ADD COLUMN "isMultiDay" BOOLEAN NOT NULL DEFAULT false;
