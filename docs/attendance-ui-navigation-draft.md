# Attendance UI Navigation Draft

This document defines the recommended menu and screen grouping when the field-force MVP is embedded into the attendance application.

The goal is to keep the UI simple, prevent menu collisions, and avoid confusing attendance actions with field-force operational actions.

## Design Goal

- keep one app shell
- keep one login
- keep field-force clearly separated as a module
- prevent admin tools and field-force tools from mixing with attendance flows

## Main Navigation Strategy

Use one shared shell with role-based menu visibility.

Recommended top-level groups:

- `Home`
- `Attendance`
- `Field Force`
- `Admin` (optional if your app already groups admin-only tools)

If the attendance app already uses a sidebar, field-force should appear as a grouped section inside that sidebar rather than as scattered standalone items.

## Admin / Supervisor Sidebar Draft

Recommended sidebar structure for `ADMIN` and `SUPERVISOR`:

- `Dashboard`
- `Attendance`
- `Attendance / Today`
- `Attendance / History`
- `Attendance / Approvals`
- `Employees`
- `Field Force`
- `Field Force / Live Monitor`
- `Field Force / Import Outlet`
- `Field Force / Master Outlet`
- `Field Force / Assignment`
- `Field Force / Task Monitor`

Notes:

- `ADMIN` sees all items.
- `SUPERVISOR` sees the field-force group and only the attendance sections allowed by the attendance system.
- Keep all field-force tools under one section label so users immediately understand the context switch.

## Field Force User Navigation Draft

Recommended mobile-friendly menu for `FIELD_FORCE`:

- `Home`
- `Attendance`
- `Route Today`
- `Visit Tasks`
- `History` (attendance history, if already part of the app)

Recommended behavior:

- `Route Today` should be the main operational landing page for field-force users
- `Visit Tasks` can deep-link to task detail or list views
- field-force users should not see import, assignment, or admin monitoring tools

## Standard Employee Navigation Draft

Recommended menu for `EMPLOYEE`:

- `Home`
- `Attendance`
- `History`

No field-force menus should appear.

## Recommended Route Grouping

To keep UI ownership clear, use route namespaces that mirror the menu.

### Attendance

- `/attendance`
- `/attendance/history`
- `/attendance/approvals`

### Field Force

- `/field-force/route-today`
- `/field-force/tasks/[taskId]`
- `/field-force/history` (optional, if visit history is later added)

### Field Force Admin

- `/field-force/admin/live`
- `/field-force/admin/import`
- `/field-force/admin/outlets`
- `/field-force/admin/assignments`
- `/field-force/admin/tasks`

This structure makes it obvious whether the user is inside attendance or field-force at any time.

## Dashboard Layout Draft

Do not mix attendance and field-force widgets in one undifferentiated block.

### Admin Dashboard

Recommended sections:

- `Attendance Snapshot`
- `Field Force Snapshot`

Field-force snapshot can include:

- live field-force count
- today task counts
- assignment count
- quick links to import, outlets, and assignment

### Field Force Home

Recommended sections:

- `Attendance Quick Actions` (if needed by your main app)
- `Route Today`
- `Tracking Status`

If you want the app to stay simple, `Route Today` should be the first visible block for field-force users.

## Mobile UX Draft

For mobile:

- use compact top navigation or a bottom sheet menu
- keep field-force menu labels short
- prioritize:
  - `Route Today`
  - `Start Duty`
  - `Open Task`

Recommended mobile order for field-force:

1. route summary
2. start/stop duty
3. route map
4. outlet detail cards

Do not place large admin tool links in the same mobile navigation used by field-force.

## Visual Separation Rules

To avoid confusion:

- attendance uses labels such as `Clock In`, `Shift`, `Leave`, `Approval`
- field-force uses labels such as `Route`, `Outlet`, `Visit`, `Tracking`

Even if the visual theme is shared, the wording must clearly separate the two domains.

## Suggested MVP Screen Set

For the merged MVP, these are the only screens you really need:

### Admin / Supervisor

- `Field Force / Live Monitor`
- `Field Force / Import Outlet`
- `Field Force / Master Outlet`
- `Field Force / Assignment`

### Field Force

- `Field Force / Route Today`
- `Field Force / Task Detail`

### Shared Attendance

- existing attendance screens, unchanged

This keeps the merge small and avoids feature bloat.

## Breadcrumb / Header Draft

Recommended header labels:

- `Attendance / Today`
- `Field Force / Route Today`
- `Field Force / Admin / Assignment`

These breadcrumbs reduce confusion when users switch between modules.

## Transition Strategy

When integrating:

1. Add the `Field Force` sidebar group first.
2. Move current field-force pages under `/field-force/...`.
3. Keep attendance menus exactly where users already expect them.
4. Hide field-force menus for non-field users.
5. Only after that, refine dashboard combinations if needed.

This gives the cleanest MVP transition with minimal UI shock.

## MVP Recommendation

For the first merged version:

- one shared shell
- one login
- one clearly labeled `Field Force` menu group
- field-force users land on `Route Today`
- admin/supervisor manage field-force from a dedicated field-force section

That is the simplest UI structure that avoids collisions and keeps the product understandable.
