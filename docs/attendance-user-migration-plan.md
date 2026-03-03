# Attendance User Migration Plan

This document describes how to move from the current field-force-local `User` model to the attendance app's shared employee source without breaking assignments, tasks, visits, or tracking history.

## Goal

- stop using the field-force-local user table as the source of truth
- connect field-force records to attendance employees
- preserve existing outlet assignments, task history, visits, and tracking data

## Current Risk

Today, field-force data points to the local `User` table:

- `Assignment.userId`
- `Task.userId`
- `DutySession.userId`
- `LocationPing.userId`
- `Outlet.supervisorId`
- `Outlet.fieldForceId` (legacy compatibility)

If the attendance app becomes the main identity source, deleting or replacing this local user table too early will orphan operational records.

## Migration Strategy

Use a staged migration with temporary dual references.

Do not:

- delete the local `User` table first
- rename all foreign keys in one step
- switch auth and data references in the same release without a backfill phase

## Recommended Staged Plan

### Phase 1: Prepare Shared Employee Mapping

Prerequisite:

- the attendance app must already have a stable `Employee` or shared `User` table

Actions:

- confirm how employees are uniquely identified:
  - preferred: stable employee ID
  - fallback: unique email
- ensure field-force users can be matched to attendance employees
- mark inactive employees in attendance rather than deleting them

Output:

- a reliable mapping source between local field-force users and attendance employees

### Phase 2: Add Parallel Employee References

Add new nullable columns to field-force tables:

- `Assignment.employeeId`
- `Task.employeeId`
- `DutySession.employeeId`
- `LocationPing.employeeId`
- `Outlet.supervisorEmployeeId`

Keep old columns temporarily:

- `userId`
- `supervisorId`

At this stage:

- application still reads from old columns
- new columns exist only for backfill

### Phase 3: Backfill Identity Links

Backfill the new `employeeId` fields by matching existing local users to attendance employees.

Recommended matching order:

1. exact employee code match, if available
2. exact email match
3. exact normalized full name match
4. manual review queue for unresolved rows

Backfill targets:

- assignment rows
- task rows
- duty sessions
- location pings
- outlet supervisor references

Important:

- do not auto-guess ambiguous name matches
- unresolved mappings should be flagged for manual review

### Phase 4: Validate Backfill Completeness

Before switching application reads:

- count rows with null `employeeId`
- count rows with conflicting mappings
- compare total rows before and after backfill
- verify several random users manually

Minimum validation checks:

- all active assignments have `employeeId`
- all open tasks have `employeeId`
- all recent duty sessions have `employeeId`
- all recent location pings have `employeeId`

If any critical table still has unresolved rows, stop and fix the mapping first.

### Phase 5: Switch Application Reads

Update application code to read and write the new shared employee references.

At this point:

- auth uses attendance employee/session
- field-force pages resolve access by attendance employee role/permission
- assignment, task, and tracking APIs use `employeeId`

The old local `User` table still exists for rollback safety, but is no longer the live source of truth.

### Phase 6: Move Module-Specific Fields

Move these fields out of the old local `User` record:

- `territory`
- `territoryGroup`
- `lastKnownLat`
- `lastKnownLon`
- `lastKnownAccuracy`
- `lastPingAt`

Recommended destination:

- `FieldForceProfile`

This keeps the attendance employee model clean while preserving module-specific data.

### Phase 7: Deprecate Old Columns

Once all code paths use attendance employees:

- make new `employeeId` columns required where appropriate
- remove legacy `userId` references
- remove legacy `supervisorId` if replaced by `supervisorEmployeeId`
- optionally remove `Outlet.fieldForceId` if `Assignment` is fully authoritative

### Phase 8: Remove Local User Table

Only after all previous phases are complete:

- archive a backup
- remove the local field-force `User` model
- remove duplicate local user-management UI

This should be the final cleanup step, not the first migration step.

## Data Matching Rules

Use strict, deterministic matching rules.

Preferred identity keys:

- employee number / HRIS ID
- company email

Fallback:

- normalized full name only if unique

Never auto-merge when:

- two attendance employees match one field-force user by name
- one field-force email maps to multiple employee records
- the employee is inactive and a newer active record exists

Those cases need manual resolution.

## Recommended Temporary Audit Table

During migration, it helps to create a small audit table or export:

- local user ID
- local user email
- local user name
- matched employee ID
- matched by (`employee_code`, `email`, `name`)
- status (`matched`, `ambiguous`, `missing`)

This makes it easy to validate and rerun the backfill safely.

## Rollback Strategy

Until old columns are removed:

- keep legacy `userId` values untouched
- do not drop local user records
- keep a DB backup before every destructive migration

If the new attendance mapping is wrong:

- revert app reads to old columns
- fix match data
- rerun backfill

## MVP Recommendation

For the first merge:

- use attendance employee as the read source
- keep the old local user table for one transition release
- do not remove legacy columns until the module runs cleanly in production-like testing

That gives the safest path with minimal operational risk.
