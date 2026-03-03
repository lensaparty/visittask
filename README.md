# Field Force Visit Tasks MVP

Minimal web MVP for field-force outlet visits with:

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Leaflet + OpenStreetMap tiles
- Email/password auth with JWT cookies

## What It Does

### Field Force

- Login with email and password
- Start or stop duty tracking
- Send browser geolocation pings every 45 seconds while duty is active
- View today's tasks
- Open a task detail page with outlet map and current device location
- Check in only if within 100 meters of the outlet coordinates
- Check out and store final coordinates

### Supervisor

- View field-force users and their last known location ping
- View today's task status summary
- Upload the source Excel file to import outlets and assigned users
- Generate tasks for a date range using odd/even ISO week rules

## Data Rules

- `Koordinat` is parsed from `"lat , lon"` text, for example `"-7.219867 , 106.894733"`.
- `Ganjil` is used on odd ISO weeks.
- `Genap` is used on even ISO weeks.
- If the selected schedule day matches the date's weekday, a task is generated for the assigned field-force user.
- `0` in `Ganjil` or `Genap` means no schedule for that parity.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL and make sure `DATABASE_URL` points to it.

4. Apply the Prisma migration:

   ```bash
   npm run db:migrate
   ```

5. Generate the Prisma client if needed:

   ```bash
   npm run db:generate
   ```

6. Seed demo data:

   ```bash
   npm run db:seed
   ```

7. Start the app:

   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Seeded Accounts

Default password comes from `DEFAULT_IMPORTED_USER_PASSWORD` in `.env`.

- Supervisor: `supervisor.demo@example.com`
- Field force: `aris.ff@example.com`
- Field force: `dina.ff@example.com`

## Excel Import

Upload the workbook from the supervisor dashboard.

- The first worksheet is used.
- Missing `Kode Toko`, `Nama Toko`, `Alamat`, or invalid `Koordinat` rows are skipped.
- Import does not auto-create users.
- Supervisor and field-force columns only link to existing users when the names already match a user in the system.
- If no matching user exists yet, the outlet is still imported but user relations stay empty until admin creates the user manually and assigns outlets.

## Task Generation

Use the supervisor dashboard date-range form.

- Max range is 31 days per request.
- Duplicate tasks are skipped using a unique constraint on `outletId + userId + scheduledDate`.
- Nothing runs automatically on server start in development.

Manual API example:

```bash
curl -X POST http://localhost:3000/api/tasks/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: ff_session=YOUR_SESSION_COOKIE" \
  -d '{"from":"2026-03-01","to":"2026-03-07"}'
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Verified

The project was validated with:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Firebase Deploy

For Firebase App Hosting deployment, use:

- [`apphosting.yaml`](/Users/mrwk/Documents/TASK%20TRACKING/apphosting.yaml)
- [`docs/firebase-app-hosting-deploy.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/firebase-app-hosting-deploy.md)

## Vercel Deploy

For the fastest MVP deployment path, use:

- [`docs/vercel-deploy.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/vercel-deploy.md)

## Integration Notes

If this module will later be merged into an attendance app, use the blueprint here:

- [`docs/attendance-integration-blueprint.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/attendance-integration-blueprint.md)
- [`docs/attendance-schema-merge-plan.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/attendance-schema-merge-plan.md)
- [`docs/attendance-prisma-draft.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/attendance-prisma-draft.md)
- [`docs/attendance-prisma-migration-draft.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/attendance-prisma-migration-draft.md)
- [`docs/attendance-api-route-mapping.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/attendance-api-route-mapping.md)
- [`docs/attendance-ui-navigation-draft.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/attendance-ui-navigation-draft.md)
- [`docs/attendance-user-migration-plan.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/attendance-user-migration-plan.md)
- [`docs/attendance-role-permission-matrix.md`](/Users/mrwk/Documents/TASK%20TRACKING/docs/attendance-role-permission-matrix.md)
