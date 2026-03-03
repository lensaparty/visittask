# Attendance Schema Merge Plan

This document translates the current field-force MVP Prisma models into a safe merged schema plan for an attendance application.

## Objective

When the field-force module is merged into an attendance app:

- attendance becomes the source of truth for employee identity
- field-force keeps its own operational tables
- only the identity and permission layer is shared

This avoids collisions between attendance clock events and visit task execution.

## Current Field-Force Schema Summary

Current field-force models:

- `User`
- `Outlet`
- `Assignment`
- `Task`
- `Visit`
- `DutySession`
- `LocationPing`

Current enums:

- `UserRole`
- `ScheduleDay`
- `WeekParity`
- `TaskStatus`

The main merge concern is the current local `User` model, because attendance apps usually already have an employee table.

## Recommended Shared Identity Model

In the merged app, the attendance system should own the employee table.

Recommended shared identity model:

- `Employee` or existing attendance `User`

This shared identity table should contain:

- `id`
- `name`
- `email`
- `passwordHash` or external auth identifier
- attendance role / permission source
- optional profile data such as phone, division, branch

If the attendance app already has a user table, do not create a second employee master.

## Replace Local Field-Force User

Current field-force `User` should be replaced by the attendance identity table.

Current `User` fields:

- `id`
- `name`
- `email`
- `passwordHash`
- `role`
- `phone`
- `territory`
- `territoryGroup`
- last known tracking snapshot fields

Recommended merge rule:

- Move auth and base profile ownership to attendance `Employee`
- Keep field-force-specific operational snapshots outside the shared user table where possible

## Recommended Model Split

Use this separation:

### Attendance-owned

- `Employee` (or existing attendance `User`)
- `AttendanceLog`
- `Shift`
- `LeaveRequest`
- attendance-specific approvals and reports

### Field-force-owned

- `FieldForceProfile` (optional helper model)
- `Outlet`
- `Assignment`
- `Task`
- `Visit`
- `DutySession`
- `LocationPing`

## Recommended New Helper Model

To avoid bloating the attendance employee table, add a field-force extension model.

Example intent:

- `FieldForceProfile`
  - `employeeId`
  - `territory`
  - `territoryGroup`
  - `lastKnownLat`
  - `lastKnownLon`
  - `lastKnownAccuracy`
  - `lastPingAt`

Why:

- these fields are operational and module-specific
- they should not pollute attendance HR data
- they let field-force evolve without risky edits to the attendance core schema

## Direct Model Mapping

### 1. User -> Employee + FieldForceProfile

Current model:

- `User`

Merged target:

- existing attendance `Employee` or `User`
- optional `FieldForceProfile`

Mapping:

- `User.id` -> `Employee.id`
- `User.name` -> `Employee.name`
- `User.email` -> `Employee.email`
- `User.passwordHash` -> attendance auth store
- `User.phone` -> `Employee.phone` if attendance already has it
- `User.territory` -> `FieldForceProfile.territory`
- `User.territoryGroup` -> `FieldForceProfile.territoryGroup`
- `User.lastKnownLat` -> `FieldForceProfile.lastKnownLat`
- `User.lastKnownLon` -> `FieldForceProfile.lastKnownLon`
- `User.lastKnownAccuracy` -> `FieldForceProfile.lastKnownAccuracy`
- `User.lastPingAt` -> `FieldForceProfile.lastPingAt`

### 2. Outlet

Current model:

- `Outlet`

Merged target:

- keep as field-force module table

Reason:

- outlets are operational visit targets
- attendance usually has no direct equivalent

Recommended relation changes:

- `supervisorId` should reference shared `Employee.id`
- `fieldForceId` can be kept only if still needed for compatibility, but `Assignment` should remain the real source of truth

### 3. Assignment

Current model:

- `Assignment`

Merged target:

- keep as field-force module table

Recommended relation changes:

- `userId` should become `employeeId` if the merged app standardizes on employee naming
- relation should point to shared attendance employee table

Recommended future naming:

- `Assignment.employeeId`
- `Assignment.outletId`

### 4. Task

Current model:

- `Task`

Merged target:

- keep as field-force module table

Reason:

- attendance tasks and field visit tasks are different concepts
- do not merge this with generic workflow task tables unless the attendance app already has a strong cross-module task engine

Recommended relation changes:

- `userId` -> `employeeId`
- relation points to shared attendance employee table

### 5. Visit

Current model:

- `Visit`

Merged target:

- keep as field-force module table

Reason:

- visit execution is unique to outlet operations
- should not share the same table as attendance clock events

### 6. DutySession

Current model:

- `DutySession`

Merged target:

- keep as field-force module table

Reason:

- this is operational route-tracking state
- it is not equal to work attendance clock-in/clock-out

Important:

- do not replace attendance check-in/out with `DutySession`
- a user may have an attendance clock-in and a separate field-force duty session in the same day

### 7. LocationPing

Current model:

- `LocationPing`

Merged target:

- keep as field-force module table

Reason:

- these are live route pings
- attendance may have static check-in coordinates, but that is a different dataset

## Enum Merge Plan

### UserRole

Current enum:

- `FIELD_FORCE`
- `SUPERVISOR`

Recommended merged enum or permission system:

- `ADMIN`
- `SUPERVISOR`
- `FIELD_FORCE`
- `EMPLOYEE`

If the attendance app already has a role model, prefer:

- keep attendance role tables as-is
- add permissions/flags instead of replacing everything with this enum

### ScheduleDay

Keep it as-is.

Reason:

- this is specific to field-force task generation
- it does not conflict with attendance

### WeekParity

Keep it as-is.

Reason:

- scheduling-specific
- isolated to field-force task generation

### TaskStatus

Keep it field-force-specific.

Recommended long-term cleanup:

- keep canonical statuses only:
  - `PENDING`
  - `IN_PROGRESS`
  - `DONE`
  - `MISSED`

Legacy compatibility values currently present:

- `CHECKED_IN`
- `COMPLETED`

These should be removed only after a controlled data migration.

## Naming Changes Recommended During Merge

To reduce ambiguity in the combined codebase:

- rename field-force `userId` columns to `employeeId`
- keep attendance models using their existing names
- optionally prefix module tables in code comments or docs as `FieldForce`

Examples:

- `Assignment.userId` -> `Assignment.employeeId`
- `Task.userId` -> `Task.employeeId`
- `DutySession.userId` -> `DutySession.employeeId`
- `LocationPing.userId` -> `LocationPing.employeeId`

This makes code reviews and reporting queries much easier to read.

## Safe Migration Order

Apply schema changes in this order:

1. Add attendance employee references alongside existing `userId`.
2. Backfill those references from the current local `User`.
3. Switch application reads to the shared employee source.
4. Move field-force-only profile fields into `FieldForceProfile` if needed.
5. Rename columns from `userId` to `employeeId`.
6. Remove the old local field-force `User` model only after all relations are migrated.

Do not delete the local `User` table early.

## Minimal Merged Prisma Shape

At MVP level, the merged data model should conceptually look like:

- attendance `Employee`
- optional `FieldForceProfile`
- `Outlet`
- `Assignment`
- `Task`
- `Visit`
- `DutySession`
- `LocationPing`

This gives:

- one employee source
- no duplicate login system
- no conflict with attendance logs
- clear operational ownership for the field-force module

## Immediate Recommendation

For the first merge iteration:

- keep all field-force operational tables
- stop using local field-force `User` as the source of truth
- connect all field-force relations to the attendance employee table
- add `FieldForceProfile` only if the attendance employee table should stay clean

That is the lowest-risk schema merge path for the current MVP.
