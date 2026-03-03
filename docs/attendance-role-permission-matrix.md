# Attendance Role Permission Matrix

This matrix defines which roles should see and use which field-force and attendance features once the field-force MVP is merged into the attendance app.

## Recommended Roles

- `ADMIN`
- `SUPERVISOR`
- `FIELD_FORCE`
- `EMPLOYEE`

These can be implemented as:

- a single enum, or
- existing attendance roles plus a permission layer

The matrix below describes the required behavior, not the implementation detail.

## Menu Visibility Matrix

| Feature / Menu | ADMIN | SUPERVISOR | FIELD_FORCE | EMPLOYEE |
| --- | --- | --- | --- | --- |
| Attendance Home | Yes | Yes | Yes | Yes |
| Attendance History | Yes | Yes | Yes | Yes |
| Attendance Approvals | Yes | Optional | No | No |
| Employee Directory | Yes | Optional | No | No |
| Field Force Dashboard | Yes | Yes | No | No |
| Field Force Import Outlet | Yes | Yes | No | No |
| Field Force Master Outlet | Yes | Yes | No | No |
| Field Force Assignment | Yes | Yes | No | No |
| Field Force Task Monitor | Yes | Yes | No | No |
| Field Force Route Today | Optional | Optional | Yes | No |
| Field Force Visit Tasks | Optional | Optional | Yes | No |

## Page Access Matrix

| Page / Route | ADMIN | SUPERVISOR | FIELD_FORCE | EMPLOYEE |
| --- | --- | --- | --- | --- |
| `/attendance/...` | Yes | Yes | Yes | Yes |
| `/field-force/admin/live` | Yes | Yes | No | No |
| `/field-force/admin/import` | Yes | Yes | No | No |
| `/field-force/admin/outlets` | Yes | Yes | No | No |
| `/field-force/admin/assignments` | Yes | Yes | No | No |
| `/field-force/route-today` | Optional | Optional | Yes | No |
| `/field-force/tasks/[taskId]` | No | No | Yes (own task only) | No |

Notes:

- `Optional` means access can be enabled if a supervisor/admin also acts as field force in the business process.
- Field force should never access admin field-force tools.
- Employees without field-force role should not see or open field-force pages.

## API Access Matrix

| API | ADMIN | SUPERVISOR | FIELD_FORCE | EMPLOYEE |
| --- | --- | --- | --- | --- |
| `/api/field-force/outlets/import` | Yes | Yes | No | No |
| `/api/field-force/outlets/reset` | Yes | Yes | No | No |
| `/api/field-force/assignments` | Yes | Yes | No | No |
| `/api/field-force/assignments/bulk` | Yes | Yes | No | No |
| `/api/field-force/tasks/generate` | Yes | Yes | No | No |
| `/api/field-force/tasks/today` | No | No | Yes | No |
| `/api/field-force/tasks/[taskId]/checkin` | No | No | Yes (own task only) | No |
| `/api/field-force/tasks/[taskId]/checkout` | No | No | Yes (own task only) | No |
| `/api/field-force/tracking/duty/start` | No | No | Yes | No |
| `/api/field-force/tracking/duty/stop` | No | No | Yes | No |
| `/api/field-force/tracking/ping` | No | No | Yes | No |
| `/api/field-force/live` | Yes | Yes | No | No |

## Operational Rules By Role

### ADMIN

- Full attendance access
- Full field-force access
- Can manage outlet data
- Can manage assignments
- Can generate tasks
- Can view live field-force tracking
- Can reset outlet data in controlled admin workflows

### SUPERVISOR

- Keeps normal attendance access as allowed by the attendance app
- Can manage field-force operations:
  - import outlets
  - manage master outlet
  - assign outlets
  - generate tasks
  - monitor live location
- Cannot access or edit unrelated system-admin-only security settings

### FIELD_FORCE

- Keeps normal employee attendance features
- Can:
  - view assigned route
  - start/stop duty
  - send tracking pings
  - open navigation
  - view own tasks
  - check in/out only for own tasks
- Cannot:
  - import outlets
  - assign outlets
  - generate tasks for others
  - inspect other employees' location data

### EMPLOYEE

- Uses attendance only
- No field-force menu
- No field-force API access

## Ownership Rules

To prevent confusion:

- attendance data access should remain broad for the roles already defined by the attendance app
- field-force access should be explicitly granted, not assumed
- field-force task ownership must always be constrained to the logged-in employee

Critical enforcement rules:

- field force can only open their own route and own tasks
- supervisor/admin can manage configuration but should not execute field check-in/out as another user
- location pings must always be tied to the authenticated employee session

## MVP Permission Recommendation

For the first merged MVP:

- `ADMIN`
  - all attendance + all field-force
- `SUPERVISOR`
  - attendance access + field-force admin tools
- `FIELD_FORCE`
  - attendance employee tools + route/task execution only
- `EMPLOYEE`
  - attendance-only

This is the cleanest permission baseline and minimizes accidental access leakage.
