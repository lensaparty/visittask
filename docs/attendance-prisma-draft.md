# Attendance Prisma Draft

This draft shows the recommended merged Prisma shape when the field-force MVP is embedded into an attendance application.

It is intentionally a design draft, not a direct drop-in schema. The goal is to make final table ownership, relation names, and module boundaries explicit before any migration is executed.

## Design Goals

- One shared identity source
- No duplicate login system
- Attendance and field-force remain separate modules
- Field-force keeps operational tables for outlet visits
- Naming is explicit enough to avoid confusion in a combined codebase

## Recommended Conceptual Prisma Draft

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AppRole {
  ADMIN
  SUPERVISOR
  FIELD_FORCE
  EMPLOYEE
}

enum ScheduleDay {
  SENIN
  SELASA
  RABU
  KAMIS
  JUMAT
  SABTU
  MINGGU
}

enum WeekParity {
  ODD
  EVEN
}

enum VisitTaskStatus {
  PENDING
  IN_PROGRESS
  DONE
  MISSED
}

model Employee {
  id               String              @id @default(cuid())
  name             String
  email            String              @unique
  passwordHash     String?
  role             AppRole
  phone            String?
  isActive         Boolean             @default(true)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  fieldForceProfile FieldForceProfile?
  outletAssignments Assignment[]
  assignedVisitTasks VisitTask[]
  dutySessions      DutySession[]
  locationPings     LocationPing[]
  supervisedOutlets Outlet[]           @relation("OutletSupervisor")
}

model FieldForceProfile {
  id                String      @id @default(cuid())
  employeeId        String      @unique
  territory         String?
  territoryGroup    String?
  lastKnownLat      Float?
  lastKnownLon      Float?
  lastKnownAccuracy Float?
  lastPingAt        DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  employee          Employee    @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([territory])
  @@index([territoryGroup])
}

model Outlet {
  id               String        @id @default(cuid())
  storeCode        String        @unique
  name             String
  address          String
  subdistrict      String?
  regency          String?
  district         String?
  territory        String?
  territoryGroup   String?
  latitude         Float
  longitude        Float
  oddScheduleDay   ScheduleDay?
  evenScheduleDay  ScheduleDay?
  supervisorId     String?
  supervisorPhone  String?
  typeOutlet       String?
  visualPposm      String?
  brand            String?
  size             String?
  sunscreenCount   Int?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  supervisor       Employee?     @relation("OutletSupervisor", fields: [supervisorId], references: [id], onDelete: SetNull)
  assignments      Assignment[]
  visitTasks       VisitTask[]

  @@index([territory])
  @@index([territoryGroup])
  @@index([supervisorId])
}

model Assignment {
  id               String        @id @default(cuid())
  employeeId       String
  outletId         String
  active           Boolean       @default(true)
  sortOrder        Int?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  employee         Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  outlet           Outlet        @relation(fields: [outletId], references: [id], onDelete: Cascade)

  @@unique([employeeId, outletId])
  @@index([employeeId, active])
  @@index([outletId, active])
}

model VisitTask {
  id               String         @id @default(cuid())
  outletId         String
  employeeId       String
  scheduledDate    DateTime       @db.Date
  weekParity       WeekParity
  scheduleDay      ScheduleDay
  status           VisitTaskStatus @default(PENDING)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  outlet           Outlet         @relation(fields: [outletId], references: [id], onDelete: Cascade)
  employee         Employee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  visit            Visit?

  @@unique([outletId, employeeId, scheduledDate])
  @@index([employeeId, scheduledDate])
  @@index([scheduledDate, status])
}

model Visit {
  id               String         @id @default(cuid())
  visitTaskId      String         @unique
  checkInTime      DateTime?
  checkInLat       Float?
  checkInLon       Float?
  checkInDistanceM Float?
  checkOutTime     DateTime?
  checkOutLat      Float?
  checkOutLon      Float?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  visitTask        VisitTask      @relation(fields: [visitTaskId], references: [id], onDelete: Cascade)

  @@index([checkInTime])
  @@index([checkOutTime])
}

model DutySession {
  id               String         @id @default(cuid())
  employeeId       String
  startedAt        DateTime       @default(now())
  endedAt          DateTime?
  startedLat       Float?
  startedLon       Float?
  endedLat         Float?
  endedLon         Float?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  employee         Employee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  locationPings    LocationPing[]

  @@index([employeeId, endedAt])
}

model LocationPing {
  id               String         @id @default(cuid())
  employeeId       String
  dutySessionId    String?
  latitude         Float
  longitude        Float
  accuracy         Float?
  speed            Float?
  pingedAt         DateTime       @default(now())
  createdAt        DateTime       @default(now())

  employee         Employee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  dutySession      DutySession?   @relation(fields: [dutySessionId], references: [id], onDelete: SetNull)

  @@index([employeeId, pingedAt])
  @@index([pingedAt])
}
```

## Why These Names

- `Employee` is used as the shared identity source because attendance systems usually already have employee-centered semantics.
- `VisitTask` is more explicit than `Task` in a combined app, where attendance may already have task-like concepts.
- `employeeId` is clearer than `userId` when attendance and field-force share one identity table.
- `FieldForceProfile` keeps module-only tracking fields out of the attendance employee core.

## What Changes Compared To The Current MVP

- `User` becomes shared `Employee`
- `UserRole` becomes broader `AppRole`
- `Task` becomes `VisitTask`
- all `userId` references become `employeeId`
- last ping snapshot fields move from `User` into `FieldForceProfile`
- `Outlet.fieldForceId` is removed as the primary assignment source; `Assignment` remains the source of truth

## What Stays The Same

- odd/even schedule logic
- visit check-in/out flow
- duty tracking
- location ping storage
- outlet import and assignment concepts

## MVP Merge Recommendation

For the first combined release, use this draft as the target shape conceptually, but migrate in stages:

1. Reuse attendance employee identity.
2. Rename relations gradually.
3. Keep table behavior stable until all API and UI code moves to the new names.

Do not rename everything in one risky migration.
