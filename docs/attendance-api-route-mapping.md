# Attendance API Route Mapping

This document maps the current field-force MVP API routes to the recommended route structure when the module is merged into an attendance application.

The goal is to prevent collisions with attendance APIs by moving field-force endpoints under a dedicated namespace.

## Route Naming Goal

Recommended target API namespace:

- `/api/field-force/...`

Reason:

- avoids collisions with attendance routes like `tasks`, `tracking`, `users`, and `admin`
- makes ownership clear in logs, middleware, and API gateways
- lets the attendance app keep its own `/api/auth/...` and `/api/attendance/...` routes cleanly separated

## General Rule

When merged:

- field-force operational APIs move under `/api/field-force/...`
- attendance APIs stay under `/api/attendance/...` or whatever the attendance app already uses
- shared auth stays in the attendance app and should not be duplicated inside field-force

## Current To Target Mapping

### Auth

These are currently field-force-local auth endpoints, but in a merged app they should be replaced by the attendance app auth.

| Current Route | Recommended Target | Action |
| --- | --- | --- |
| `/api/auth/login` | attendance auth route | Remove field-force-local login after shared auth is active |
| `/api/auth/logout` | attendance auth route | Remove field-force-local logout after shared auth is active |

Recommended rule:

- do not create `/api/field-force/auth/...`
- reuse the attendance app's single login/logout/session middleware

### Outlet Import And Reset

| Current Route | Recommended Target |
| --- | --- |
| `/api/admin/import-outlets` | `/api/field-force/outlets/import` |
| `/api/outlets/import` | `/api/field-force/outlets/import` |
| `/api/admin/outlets/reset` | `/api/field-force/outlets/reset` |

Notes:

- `api/outlets/import` is already a compatibility route today, so in the merged app the module should converge on one route only.
- keep only one canonical import endpoint in the final integrated version.

### Assignment Management

| Current Route | Recommended Target |
| --- | --- |
| `/api/admin/assignments` | `/api/field-force/assignments` |
| `/api/admin/assignments/bulk` | `/api/field-force/assignments/bulk` |

Recommended semantics:

- `GET /api/field-force/assignments`
  - list assignments for selected employee
- `POST /api/field-force/assignments/bulk`
  - sync/stage final assignment set for the employee
- `DELETE /api/field-force/assignments`
  - cleanup inactive assignment rows if that behavior remains enabled

### Task Generation And Task Execution

| Current Route | Recommended Target |
| --- | --- |
| `/api/tasks/generate` | `/api/field-force/tasks/generate` |
| `/api/tasks/today` | `/api/field-force/tasks/today` |
| `/api/tasks/[taskId]/checkin` | `/api/field-force/tasks/[taskId]/checkin` |
| `/api/tasks/[taskId]/checkout` | `/api/field-force/tasks/[taskId]/checkout` |

Recommended naming note:

- if the merged schema later renames `Task` to `VisitTask`, the HTTP path can still remain `/tasks/...` for shorter URLs, or become `/visit-tasks/...` for stronger explicitness
- for MVP integration, keeping `/tasks/...` under `/api/field-force/` is the least disruptive

### Tracking

| Current Route | Recommended Target |
| --- | --- |
| `/api/tracking/ping` | `/api/field-force/tracking/ping` |
| `/api/tracking/duty/start` | `/api/field-force/tracking/duty/start` |
| `/api/tracking/duty/stop` | `/api/field-force/tracking/duty/stop` |

Reason:

- attendance may later have its own location-aware or mobile device endpoints
- `tracking` is too generic to leave at the top level in a combined system

### Supervisor Live Monitoring

| Current Route | Recommended Target |
| --- | --- |
| `/api/supervisor/live` | `/api/field-force/live` |

Reason:

- avoid route naming that ties API ownership to a role name
- `live` under `field-force` is simpler and still role-protected

The role should be enforced by middleware or handler authorization, not by the route path name itself.

### User Management

| Current Route | Recommended Target |
| --- | --- |
| `/api/admin/users` | do not keep as field-force-owned if attendance has employee master |
| `/api/admin/users/[userId]` | do not keep as field-force-owned if attendance has employee master |
| `/api/admin/users/[userId]/reset-password` | do not keep as field-force-owned if attendance owns auth |

Recommended rule:

- once integrated, employee creation/editing/password reset should belong to the attendance employee/admin module
- field-force should not continue to own duplicate employee CRUD unless there is a temporary transition need

If a temporary compatibility layer is needed:

- use `/api/field-force/employee-links/...` only for field-force-specific mapping, not for full employee identity management

## Recommended Final Canonical Endpoints

These are the routes the merged field-force module should ultimately expose:

- `/api/field-force/outlets/import`
- `/api/field-force/outlets/reset`
- `/api/field-force/assignments`
- `/api/field-force/assignments/bulk`
- `/api/field-force/tasks/generate`
- `/api/field-force/tasks/today`
- `/api/field-force/tasks/[taskId]/checkin`
- `/api/field-force/tasks/[taskId]/checkout`
- `/api/field-force/tracking/ping`
- `/api/field-force/tracking/duty/start`
- `/api/field-force/tracking/duty/stop`
- `/api/field-force/live`

## Transition Strategy

Do not rename all routes in one release.

Use this rollout:

1. Add new `/api/field-force/...` handlers.
2. Keep old routes as compatibility wrappers that delegate to the new handlers.
3. Move frontend calls to the new routes.
4. Update any mobile/web clients or external integrations.
5. Remove old top-level routes only after the transition period.

This is the same low-risk approach already used in the current MVP for some compatibility routes.

## Compatibility Wrapper Recommendation

During transition, old routes should:

- call the same shared service layer as the new routes
- return the same JSON contract
- log a deprecation warning on the server where practical

Example pattern:

- old route `/api/tasks/generate`
  - delegates to the same internal generator used by `/api/field-force/tasks/generate`

This minimizes code duplication and reduces migration risk.

## Frontend Update Order

When the new routes exist, update frontend modules in this order:

1. Supervisor admin tools
2. Assignment pages
3. Field-force route page
4. Task detail actions
5. Tracking duty controls

This order reduces the chance of partial routing mismatches in daily operations.

## MVP Recommendation

For the first merged MVP:

- keep auth owned by attendance
- move all field-force operational APIs under `/api/field-force/...`
- keep old routes only as temporary wrappers

That is the cleanest route structure with the least risk of namespace collisions.
