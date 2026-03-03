# Attendance Prisma Migration Draft

This document is a practical migration sequence for moving the current field-force MVP schema toward the merged attendance + field-force target shape.

It is written as a low-risk rollout plan, not as a single destructive migration.

## Scope

Current local field-force schema:

- `User`
- `Outlet`
- `Assignment`
- `Task`
- `Visit`
- `DutySession`
- `LocationPing`

Target direction:

- attendance app owns shared `Employee` identity
- field-force tables remain separate
- `userId` references are gradually replaced with `employeeId`
- field-force-specific user snapshot fields move into `FieldForceProfile`

## Migration Principles

- Never replace the local `User` table in one step.
- Add new columns first, backfill second, switch reads third, clean up last.
- Keep at least one rollback-safe release where both old and new identity references exist.
- Avoid renaming tables/columns before application code can read both versions.

## Phase 0: Prerequisites

Before touching field-force tables:

1. The attendance app must already have a stable shared identity table:
   - `Employee`, or
   - an existing app `User` that acts as employee master
2. Each field-force local user must be matchable to an attendance employee via:
   - employee code, or
   - unique email, or
   - unique normalized full name
3. You must take a database backup before each destructive phase.

## Phase 1: Add Shared Employee Mapping Support

### Goal

Add new nullable foreign-key-ready columns without changing application behavior yet.

### Prisma-level draft change

Add these new nullable columns first:

- `Assignment.employeeId String?`
- `Task.employeeId String?`
- `DutySession.employeeId String?`
- `LocationPing.employeeId String?`
- `Outlet.supervisorEmployeeId String?`

Do not remove:

- `Assignment.userId`
- `Task.userId`
- `DutySession.userId`
- `LocationPing.userId`
- `Outlet.supervisorId`

### SQL draft

```sql
ALTER TABLE "Assignment" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "Task" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "DutySession" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "LocationPing" ADD COLUMN "employeeId" TEXT;
ALTER TABLE "Outlet" ADD COLUMN "supervisorEmployeeId" TEXT;
```

If the attendance table is called `"Employee"`:

```sql
ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;

ALTER TABLE "DutySession"
  ADD CONSTRAINT "DutySession_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;

ALTER TABLE "LocationPing"
  ADD CONSTRAINT "LocationPing_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;

ALTER TABLE "Outlet"
  ADD CONSTRAINT "Outlet_supervisorEmployeeId_fkey"
  FOREIGN KEY ("supervisorEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL;
```

### Index draft

```sql
CREATE INDEX "Assignment_employeeId_active_idx" ON "Assignment" ("employeeId", "active");
CREATE INDEX "Task_employeeId_scheduledDate_idx" ON "Task" ("employeeId", "scheduledDate");
CREATE INDEX "DutySession_employeeId_endedAt_idx" ON "DutySession" ("employeeId", "endedAt");
CREATE INDEX "LocationPing_employeeId_pingedAt_idx" ON "LocationPing" ("employeeId", "pingedAt");
CREATE INDEX "Outlet_supervisorEmployeeId_idx" ON "Outlet" ("supervisorEmployeeId");
```

### Release rule

At the end of Phase 1:

- app still reads old `userId`
- new columns are unused but present

## Phase 2: Backfill Employee References

### Goal

Populate the new employee columns from the attendance employee source.

### Recommended matching order

1. employee code exact match
2. email exact match
3. normalized full-name exact match
4. manual review if ambiguous

### Example helper table

If needed, create a temporary mapping table:

```sql
CREATE TABLE "_FieldForceUserEmployeeMap" (
  "localUserId" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "matchedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Populate it manually or from a controlled script before backfill.

### Example backfill SQL using a mapping table

```sql
UPDATE "Assignment" a
SET "employeeId" = m."employeeId"
FROM "_FieldForceUserEmployeeMap" m
WHERE a."userId" = m."localUserId"
  AND a."employeeId" IS NULL;

UPDATE "Task" t
SET "employeeId" = m."employeeId"
FROM "_FieldForceUserEmployeeMap" m
WHERE t."userId" = m."localUserId"
  AND t."employeeId" IS NULL;

UPDATE "DutySession" d
SET "employeeId" = m."employeeId"
FROM "_FieldForceUserEmployeeMap" m
WHERE d."userId" = m."localUserId"
  AND d."employeeId" IS NULL;

UPDATE "LocationPing" l
SET "employeeId" = m."employeeId"
FROM "_FieldForceUserEmployeeMap" m
WHERE l."userId" = m."localUserId"
  AND l."employeeId" IS NULL;

UPDATE "Outlet" o
SET "supervisorEmployeeId" = m."employeeId"
FROM "_FieldForceUserEmployeeMap" m
WHERE o."supervisorId" = m."localUserId"
  AND o."supervisorEmployeeId" IS NULL;
```

### Validation SQL

```sql
SELECT COUNT(*) AS assignment_missing_employee
FROM "Assignment"
WHERE "employeeId" IS NULL;

SELECT COUNT(*) AS task_missing_employee
FROM "Task"
WHERE "employeeId" IS NULL;

SELECT COUNT(*) AS duty_missing_employee
FROM "DutySession"
WHERE "employeeId" IS NULL;

SELECT COUNT(*) AS ping_missing_employee
FROM "LocationPing"
WHERE "employeeId" IS NULL;
```

### Release rule

At the end of Phase 2:

- both old and new references exist
- new references are populated
- app still reads old references

## Phase 3: Add FieldForceProfile

### Goal

Move field-force-specific snapshot data out of the local `User` table.

### Prisma-level draft model

```prisma
model FieldForceProfile {
  id                String   @id @default(cuid())
  employeeId        String   @unique
  territory         String?
  territoryGroup    String?
  lastKnownLat      Float?
  lastKnownLon      Float?
  lastKnownAccuracy Float?
  lastPingAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### SQL draft

```sql
CREATE TABLE "FieldForceProfile" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL UNIQUE,
  "territory" TEXT,
  "territoryGroup" TEXT,
  "lastKnownLat" DOUBLE PRECISION,
  "lastKnownLon" DOUBLE PRECISION,
  "lastKnownAccuracy" DOUBLE PRECISION,
  "lastPingAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE "FieldForceProfile"
  ADD CONSTRAINT "FieldForceProfile_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE;
```

### Backfill draft

```sql
INSERT INTO "FieldForceProfile" (
  "id",
  "employeeId",
  "territory",
  "territoryGroup",
  "lastKnownLat",
  "lastKnownLon",
  "lastKnownAccuracy",
  "lastPingAt"
)
SELECT
  gen_random_uuid()::text,
  m."employeeId",
  u."territory",
  u."territoryGroup",
  u."lastKnownLat",
  u."lastKnownLon",
  u."lastKnownAccuracy",
  u."lastPingAt"
FROM "User" u
JOIN "_FieldForceUserEmployeeMap" m
  ON m."localUserId" = u."id"
ON CONFLICT ("employeeId") DO NOTHING;
```

If `gen_random_uuid()` is unavailable, use app-generated IDs or a migration script.

### Release rule

At the end of Phase 3:

- profile data exists in `FieldForceProfile`
- app may still read `User` for compatibility, but the new source is ready

## Phase 4: Dual-Read Application Release

### Goal

Deploy code that can read new columns, while still falling back to old ones.

### Application read rule

Update reads to prefer:

- `employeeId` if present
- fallback to legacy `userId` only during transition

For supervisor relation:

- prefer `supervisorEmployeeId`
- fallback to `supervisorId`

### Application write rule

All new writes should target:

- `employeeId`
- `supervisorEmployeeId`
- `FieldForceProfile`

Do not write new business logic only to legacy columns once this release starts.

### Release rule

At the end of Phase 4:

- reads are dual-compatible
- writes prefer new columns
- rollback is still possible

## Phase 5: Enforce New References

### Goal

Once production-like testing is stable, make the new columns required where appropriate.

### SQL draft

Only do this after verifying no nulls remain:

```sql
ALTER TABLE "Assignment" ALTER COLUMN "employeeId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "employeeId" SET NOT NULL;
ALTER TABLE "DutySession" ALTER COLUMN "employeeId" SET NOT NULL;
ALTER TABLE "LocationPing" ALTER COLUMN "employeeId" SET NOT NULL;
```

`Outlet.supervisorEmployeeId` can remain nullable, because not all outlets may have a supervisor link.

### Constraint migration

If you are replacing uniqueness/indexing semantics:

```sql
CREATE UNIQUE INDEX "Task_outletId_employeeId_scheduledDate_key"
ON "Task" ("outletId", "employeeId", "scheduledDate");
```

Keep the old unique constraint temporarily until app code fully stops using `userId`.

## Phase 6: Rename Business Models in Code

### Goal

Move from compatibility naming to final merged naming.

Recommended code-level renames:

- `Task` -> `VisitTask`
- `userId` -> `employeeId`
- `UserRole` -> app-wide role or permission layer

### Important

This phase is safest when done after:

- identity backfill is complete
- dual-read release is stable
- all live writes already use new columns

This phase may be split across multiple deployments.

## Phase 7: Drop Legacy Columns

### Goal

Remove local field-force identity dependencies only after the app is fully switched.

### SQL draft

Example final cleanup:

```sql
ALTER TABLE "Assignment" DROP COLUMN "userId";
ALTER TABLE "Task" DROP COLUMN "userId";
ALTER TABLE "DutySession" DROP COLUMN "userId";
ALTER TABLE "LocationPing" DROP COLUMN "userId";
ALTER TABLE "Outlet" DROP COLUMN "supervisorId";
```

Optional cleanup if no longer needed:

```sql
ALTER TABLE "Outlet" DROP COLUMN "fieldForceId";
```

Do not do this until:

- application code no longer reads the old columns
- every row has been validated after at least one stable transition release

## Phase 8: Remove Local Field-Force User

### Goal

Delete the old local `User` model only after all relations and reads have been migrated.

### Final cleanup checklist

- no field-force runtime code reads local `User`
- no API writes local `User`
- no admin UI depends on local user management
- no foreign keys still reference local `User`
- `FieldForceProfile` and shared attendance `Employee` are live and validated

### SQL draft

```sql
DROP TABLE "User";
DROP TABLE IF EXISTS "_FieldForceUserEmployeeMap";
```

Only perform this after backup and sign-off.

## Suggested Release Packaging

For safety, package the migration across at least four releases:

1. Add columns
2. Backfill + add profile
3. Dual-read app release
4. Enforce + cleanup

This reduces operational risk compared with a single big-bang migration.

## Immediate MVP Recommendation

If you need the lowest-risk path:

- stop after Phase 4 for the first integrated MVP
- keep legacy columns for one release window
- only remove legacy columns after real usage confirms the merge is stable

That gives the team a safe rollback path while the attendance integration settles.
