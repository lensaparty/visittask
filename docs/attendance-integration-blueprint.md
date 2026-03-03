# Attendance Integration Blueprint

This document defines the safest MVP shape for merging the field-force module into an attendance app without breaking existing attendance flows.

## Goal

- Keep attendance as the main app.
- Mount field-force as a separate module inside the same app.
- Reuse one login and one employee source.
- Prevent route, role, and data collisions between attendance and field-force logic.

## Recommended App Structure

Use one app shell with separate module namespaces:

- `/attendance/...`
- `/field-force/...`
- `/admin/attendance/...`
- `/admin/field-force/...`

For APIs, keep the same separation:

- `/api/attendance/...`
- `/api/field-force/...`

This keeps attendance pages, field-force pages, and admin tools isolated even if they share the same codebase and session.

## Admin Navigation

Admin and supervisor users should see a dedicated `Field Force` group in the existing admin sidebar.

Recommended admin menu layout:

- `Dashboard`
- `Attendance`
- `Approvals`
- `Employees`
- `Field Force`
- `Field Force / Live Monitor`
- `Field Force / Import Outlet`
- `Field Force / Master Outlet`
- `Field Force / Assignment`
- `Field Force / Task Monitor`

Behavior:

- Attendance admins keep their current attendance tools untouched.
- Only users with field-force permissions see field-force menus.
- Field-force pages should not be mixed into the default attendance dashboard cards.

## User Navigation

Use one shared login. Menu visibility should depend on permission.

Recommended employee menu behavior:

- Normal employee:
  - `Home`
  - `Attendance`
  - `History`
- Field force:
  - `Home`
  - `Attendance`
  - `Route Today`
  - `Visit Tasks`
- Supervisor:
  - `Home`
  - `Attendance`
  - `Field Force Admin`

This keeps attendance available for everyone, while only field users get route/task tools.

## Role Mapping

The attendance app should become the single source of truth for identity and permissions.

Recommended normalized app roles:

- `ADMIN`
- `SUPERVISOR`
- `FIELD_FORCE`
- `EMPLOYEE`

Practical mapping rules:

- `ADMIN`
  - Full attendance access
  - Full field-force admin access
- `SUPERVISOR`
  - Attendance access based on current system rules
  - Field-force admin access for import, outlet, assignment, and monitoring
- `FIELD_FORCE`
  - Attendance employee access
  - Route, tracking, task detail, check-in, and check-out access
- `EMPLOYEE`
  - Attendance-only access
  - No field-force pages

If the attendance app already has different role names, add a lightweight permission layer instead of forcing a full rename.

## Shared vs Separate Data

The safest boundary is:

- Shared:
  - `User` or `Employee`
  - Auth/session
  - Role/permission mapping
- Field-force only:
  - `Outlet`
  - `Assignment`
  - `Task`
  - `Visit`
  - `DutySession`
  - `LocationPing`

This means attendance stays in control of employee identity, while field-force owns visit operations.

## Database Ownership

Recommended ownership model:

- Attendance module owns:
  - employee master data
  - attendance logs
  - shift data
  - approvals
- Field-force module owns:
  - outlet master
  - assignment state
  - generated visit tasks
  - visit execution
  - live tracking

Only one relation should cross modules:

- field-force tables reference `userId` from the attendance employee table

Do not reuse attendance tables for:

- visit tasks
- outlet check-in/out
- route tracking

Those are operationally different from attendance clock-in/out.

## Authentication Strategy

When merged, remove duplicate field-force login logic and reuse the attendance app session.

Recommended approach:

- One login page
- One session cookie
- One auth middleware
- Field-force pages authorize by role/permission only

Field-force should stop managing a separate password if attendance already handles authentication.

## Suggested Field-Force MVP Inside Attendance

Keep the merged MVP small and focused:

### Admin/Supervisor

- Pick active employees from attendance master data
- Import outlets
- Manage master outlet
- Assign outlets to field force
- Generate daily tasks
- Monitor live location and visit status

### Field Force

- Open `Route Today`
- Start/stop duty tracking
- Open Google Maps or Waze navigation
- Open task detail
- Check in within 100m
- Check out within 100m

### Attendance-Only Employees

- See no field-force menus
- Use attendance as usual

## Route and API Naming

To avoid collisions, field-force endpoints should move under a clear module prefix during integration.

Recommended examples:

- `/field-force/route-today`
- `/field-force/tasks/[taskId]`
- `/field-force/admin/assignments`

API examples:

- `/api/field-force/outlets/import`
- `/api/field-force/assignments/bulk`
- `/api/field-force/tasks/generate`
- `/api/field-force/tracking/ping`

This avoids conflicts with future attendance APIs that may also use names like `tasks`, `tracking`, or `users`.

## UI Rules To Avoid Confusion

- Attendance pages should keep their existing visual rhythm.
- Field-force pages can share the same theme, but must use field labels like `Route`, `Outlet`, `Visit`, and `Tracking`.
- Do not mix attendance cards and field-force cards in one dashboard block.
- Keep field-force admin tools under one clear section so supervisors do not confuse them with attendance approvals.

## Safe Migration Path

Implement the merge in this order:

1. Reuse attendance auth/session.
2. Replace field-force user source with attendance employee master.
3. Move field-force routes under `/field-force`.
4. Add role-based menu visibility.
5. Keep field-force tables as a separate module schema in the same database.
6. Deprecate duplicate field-force-only user management screens after employee-source integration is complete.

## Concrete MVP Decision

For the first merged release:

- Keep attendance and field-force in one app shell.
- Use one login.
- Use attendance employees as the only user source.
- Keep field-force data tables separate.
- Keep admin menus grouped under `Field Force`.

This gives the cleanest MVP with the least risk of role, route, and data conflicts.
