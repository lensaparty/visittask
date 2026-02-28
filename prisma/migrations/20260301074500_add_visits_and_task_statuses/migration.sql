-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'DONE';

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkInLat" DOUBLE PRECISION,
    "checkInLon" DOUBLE PRECISION,
    "checkInDistanceM" DOUBLE PRECISION,
    "checkOutTime" TIMESTAMP(3),
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visit_taskId_key" ON "Visit"("taskId");

-- CreateIndex
CREATE INDEX "Visit_checkInTime_idx" ON "Visit"("checkInTime");

-- CreateIndex
CREATE INDEX "Visit_checkOutTime_idx" ON "Visit"("checkOutTime");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing task-level check-in/out fields into visit rows
INSERT INTO "Visit" (
    "id",
    "taskId",
    "checkInTime",
    "checkInLat",
    "checkInLon",
    "checkInDistanceM",
    "checkOutTime",
    "checkOutLat",
    "checkOutLon",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('visit_', md5("id")),
    "id",
    "checkInAt",
    "checkInLat",
    "checkInLon",
    "checkInDistanceMeters",
    "checkOutAt",
    "checkOutLat",
    "checkOutLon",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Task"
WHERE "checkInAt" IS NOT NULL OR "checkOutAt" IS NOT NULL
ON CONFLICT ("taskId") DO NOTHING;

-- Normalize legacy task statuses where possible
UPDATE "Task"
SET "status" = 'IN_PROGRESS'
WHERE "status" = 'CHECKED_IN';

UPDATE "Task"
SET "status" = 'DONE'
WHERE "status" = 'COMPLETED';
