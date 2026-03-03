# Vercel Deploy Guide

This is the fastest deployment path for the current MVP.

It fits this stack well because:

- the app is a full-stack Next.js App Router project
- Vercel deploys Next.js with minimal extra configuration
- the deployed app gets HTTPS by default
- mobile browser geolocation will work on the hosted URL once the user grants permission

## Why Vercel For This MVP

This project already uses:

- Next.js
- App Router
- Server route handlers
- Prisma + PostgreSQL

That makes Vercel the lowest-friction deploy option for the current codebase.

Official references:

- [Deploying GitHub projects with Vercel](https://vercel.com/docs/deployments/git/vercel-for-github)
- [Environment variables on Vercel](https://vercel.com/docs/environment-variables)
- [Postgres on Vercel](https://vercel.com/docs/postgres)

## Current Repo Status

This repo is already committed and ready to push/deploy.

Latest deploy-prep commit:

- `31e0c2c` `feat: prepare firebase deploy and field-force api namespace`

## Required Environment Variables

Set these in Vercel Project Settings:

- `DATABASE_URL`
- `JWT_SECRET`
- `DEFAULT_IMPORTED_USER_PASSWORD`

### Recommended values

- `DATABASE_URL`
  - use your hosted Neon PostgreSQL connection string
- `JWT_SECRET`
  - use a long random secret
- `DEFAULT_IMPORTED_USER_PASSWORD`
  - use a temporary default only for seeded/import-linked users

## Important Security Note

The Neon database credential that was shared in chat should be treated as exposed.

Before production usage:

1. rotate the Neon database password
2. copy the new connection string
3. use the new connection string in Vercel

## Vercel Deploy Steps

### 1. Import The GitHub Repo

Open:

- [Vercel New Project](https://vercel.com/new)

Then:

1. log in with GitHub
2. import the repository:
   - `lensaparty/visittask`
3. choose the root directory:
   - `.`

Vercel should auto-detect:

- Framework Preset: `Next.js`

Leave the default build settings unless Vercel shows something unexpected.

### 2. Add Environment Variables

In the Vercel import screen or Project Settings, add:

- `DATABASE_URL`
- `JWT_SECRET`
- `DEFAULT_IMPORTED_USER_PASSWORD`

Apply them to:

- `Production`
- `Preview`

If you also want local sync later, you can pull them into local development with:

```bash
npx vercel env pull
```

### 3. Deploy

Click `Deploy`.

Vercel will:

- install dependencies
- build the Next.js app
- create a public HTTPS URL

Once complete, you will get a domain like:

- `https://visittask-xxxxx.vercel.app`

That URL is enough to test:

- login
- supervisor pages
- field-force route pages
- GPS in mobile browsers

## Database Migration Before First Real Use

Vercel deploys the app, but it does not automatically run Prisma migrations unless you wire that separately.

Before real usage, run the production migrations against the Neon database:

```bash
cd "/Users/mrwk/Documents/TASK TRACKING"
DATABASE_URL="YOUR_NEON_DATABASE_URL" npx prisma migrate deploy
```

If you want demo data in production-like testing:

```bash
DATABASE_URL="YOUR_NEON_DATABASE_URL" npm run db:seed
```

## Post-Deploy Validation

After deploy:

1. open the Vercel HTTPS URL
2. log in with a known account
3. test supervisor pages
4. test field-force `Route Today`
5. test `Start Duty` on mobile

Because the deployment is on HTTPS, geolocation should work in supported mobile browsers if the user grants permission.

## Recommended First Deploy Checklist

1. Rotate Neon password first.
2. Put the new `DATABASE_URL` into Vercel.
3. Add `JWT_SECRET`.
4. Add `DEFAULT_IMPORTED_USER_PASSWORD`.
5. Deploy from GitHub import.
6. Run Prisma migrations on Neon.
7. Test login and mobile GPS.

## Optional CLI Workflow

If you want to use the Vercel CLI later:

```bash
npx vercel
```

For production:

```bash
npx vercel --prod
```

But for this MVP, the GitHub import flow is simpler and safer.
