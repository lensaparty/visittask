-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_userId_outletId_key" ON "Assignment"("userId", "outletId");

-- CreateIndex
CREATE INDEX "Assignment_userId_active_idx" ON "Assignment"("userId", "active");

-- CreateIndex
CREATE INDEX "Assignment_outletId_active_idx" ON "Assignment"("outletId", "active");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing single-assignee outlet links into assignments
INSERT INTO "Assignment" ("id", "userId", "outletId", "active", "createdAt", "updatedAt")
SELECT
    CONCAT('asg_', md5("fieldForceId" || ':' || "id")),
    "fieldForceId",
    "id",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Outlet"
WHERE "fieldForceId" IS NOT NULL
ON CONFLICT ("userId", "outletId") DO UPDATE
SET "active" = EXCLUDED."active",
    "updatedAt" = CURRENT_TIMESTAMP;
