-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FIELD_FORCE', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "ScheduleDay" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU');

-- CreateEnum
CREATE TYPE "WeekParity" AS ENUM ('ODD', 'EVEN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'CHECKED_IN', 'COMPLETED', 'MISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT,
    "territory" TEXT,
    "territoryGroup" TEXT,
    "lastKnownLat" DOUBLE PRECISION,
    "lastKnownLon" DOUBLE PRECISION,
    "lastKnownAccuracy" DOUBLE PRECISION,
    "lastPingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "subdistrict" TEXT,
    "regency" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "district" TEXT,
    "territory" TEXT,
    "territoryGroup" TEXT,
    "oddScheduleDay" "ScheduleDay",
    "evenScheduleDay" "ScheduleDay",
    "supervisorId" TEXT,
    "fieldForceId" TEXT,
    "supervisorPhone" TEXT,
    "typeOutlet" TEXT,
    "visualPposm" TEXT,
    "brand" TEXT,
    "size" TEXT,
    "sunscreenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "weekParity" "WeekParity" NOT NULL,
    "scheduleDay" "ScheduleDay" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "checkInAt" TIMESTAMP(3),
    "checkInLat" DOUBLE PRECISION,
    "checkInLon" DOUBLE PRECISION,
    "checkInDistanceMeters" DOUBLE PRECISION,
    "checkOutAt" TIMESTAMP(3),
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "startedLat" DOUBLE PRECISION,
    "startedLon" DOUBLE PRECISION,
    "endedLat" DOUBLE PRECISION,
    "endedLon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dutySessionId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "pingedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_storeCode_key" ON "Outlet"("storeCode");

-- CreateIndex
CREATE INDEX "Outlet_fieldForceId_idx" ON "Outlet"("fieldForceId");

-- CreateIndex
CREATE INDEX "Outlet_supervisorId_idx" ON "Outlet"("supervisorId");

-- CreateIndex
CREATE INDEX "Outlet_territory_idx" ON "Outlet"("territory");

-- CreateIndex
CREATE UNIQUE INDEX "Task_outletId_userId_scheduledDate_key" ON "Task"("outletId", "userId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Task_userId_scheduledDate_idx" ON "Task"("userId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Task_scheduledDate_status_idx" ON "Task"("scheduledDate", "status");

-- CreateIndex
CREATE INDEX "DutySession_userId_endedAt_idx" ON "DutySession"("userId", "endedAt");

-- CreateIndex
CREATE INDEX "LocationPing_userId_pingedAt_idx" ON "LocationPing"("userId", "pingedAt");

-- CreateIndex
CREATE INDEX "LocationPing_pingedAt_idx" ON "LocationPing"("pingedAt");

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_fieldForceId_fkey" FOREIGN KEY ("fieldForceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutySession" ADD CONSTRAINT "DutySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_dutySessionId_fkey" FOREIGN KEY ("dutySessionId") REFERENCES "DutySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
