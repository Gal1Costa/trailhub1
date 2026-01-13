/*
  Warnings:

  - You are about to drop the column `mapLocation` on the `Hike` table. All the data in the column will be lost.
  - You are about to drop the column `route` on the `Hike` table. All the data in the column will be lost.
  - Added the required column `hikeId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- AlterTable
-- ALTER TABLE "Hike" DROP COLUMN "mapLocation",
--DROP COLUMN "route",
--ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
-- ALTER TABLE "Review"
-- ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- -- CreateTable
-- CREATE TABLE "AuditLog" (
--     "id" TEXT NOT NULL,
--     "actorId" TEXT,
--     "actorEmail" TEXT,
--     "action" TEXT NOT NULL,
--     "resource" TEXT,
--     "resourceId" TEXT,
--     "details" TEXT,
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
-- );

-- -- AddForeignKey
-- ALTER TABLE "Review" ADD CONSTRAINT "Review_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
