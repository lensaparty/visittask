# Firebase App Hosting Deploy Guide

This guide is the recommended deployment path for this project.

It assumes:

- the app code is stored in GitHub
- Firebase App Hosting is used for deployment
- the app is a full-stack Next.js app with App Router

## Why App Hosting

Firebase recommends App Hosting for full-stack Next.js apps.

Official references:

- [Firebase App Hosting overview](https://firebase.google.com/docs/app-hosting)
- [Get started with App Hosting](https://firebase.google.com/docs/app-hosting/get-started)
- [Configure App Hosting](https://firebase.google.com/docs/app-hosting/configure)
- [Next.js on Firebase Hosting note](https://firebase.google.com/docs/hosting/frameworks/nextjs)

The framework-aware Firebase Hosting route is still marked as early public preview, and Firebase explicitly recommends App Hosting for full-stack Next.js.

## Files Added In This Repo

- [apphosting.yaml](/Users/mrwk/Documents/TASK%20TRACKING/apphosting.yaml)

This file:

- declares required runtime secrets
- disables Next telemetry
- sets a small MVP Cloud Run profile for App Hosting

## Required Secrets

Before the first rollout, set these secrets in Firebase App Hosting:

- `DATABASE_URL`
- `JWT_SECRET`
- `DEFAULT_IMPORTED_USER_PASSWORD`

### Important

Your current local Mac PostgreSQL database cannot be used directly from Firebase App Hosting.

For deploy, `DATABASE_URL` must point to a reachable hosted PostgreSQL instance, for example:

- Neon
- Supabase
- Railway PostgreSQL
- Cloud SQL for PostgreSQL

For the simplest MVP deployment, a hosted PostgreSQL provider with a public SSL connection is the lowest-friction path.

## Git Preparation

From this project folder:

```bash
cd "/Users/mrwk/Documents/TASK TRACKING"
```

Initialize git remote if needed:

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
```

If the remote already exists, verify it:

```bash
git remote -v
```

Push the current branch:

```bash
git push -u origin main
```

## Firebase CLI Setup

Install Firebase CLI if it is not installed:

```bash
npm install -g firebase-tools
```

Log in:

```bash
firebase login
```

## Create Or Connect Firebase Project

If you already have a Firebase project, use it.

If not, create one in the Firebase console:

- [Firebase Console](https://console.firebase.google.com/)

Then note the project ID.

## Set App Hosting Secrets

Set secrets with the Firebase CLI:

```bash
firebase apphosting:secrets:set DATABASE_URL --project YOUR_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set JWT_SECRET --project YOUR_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set DEFAULT_IMPORTED_USER_PASSWORD --project YOUR_FIREBASE_PROJECT_ID
```

You will be prompted for the secret values.

## Create App Hosting Backend

Recommended path:

1. Open Firebase Console
2. Open your project
3. Go to `App Hosting`
4. Create a backend
5. Connect your GitHub repository
6. Select branch `main`
7. Set root directory to repository root:
   - `.`
8. Confirm deployment settings

Firebase will build and deploy on push to the selected branch.

## Optional CLI Backend Creation

Firebase also supports CLI-based backend setup:

```bash
firebase apphosting:backends:create --project YOUR_FIREBASE_PROJECT_ID
```

During setup:

- choose the GitHub repository
- choose branch `main`
- set root directory to `.`

## After Backend Creation

Once the backend is ready:

- push a new commit to `main`
- Firebase App Hosting triggers a rollout automatically
- your app gets an HTTPS hosted URL

That HTTPS URL is important because:

- browser geolocation for `Start Duty` works on secure origins
- field-force GPS tracking will work in mobile browsers once permission is granted

## Production Checklist

Before real usage:

1. Make sure the deployed `DATABASE_URL` points to hosted PostgreSQL.
2. Run Prisma migrations against that database.
3. Seed only if you still want demo data in that environment.
4. Confirm login works.
5. Confirm geolocation permission works on the hosted HTTPS URL.

## Prisma In Hosted Environment

This project uses Prisma with PostgreSQL.

Run migrations against the hosted database before or during initial release:

```bash
npx prisma migrate deploy
```

You can run this from your CI/CD pipeline or from a controlled admin machine against the production `DATABASE_URL`.

## Lowest-Risk MVP Deploy Path

The safest simple path is:

1. Push code to GitHub
2. Create a hosted PostgreSQL database
3. Set Firebase App Hosting secrets
4. Connect GitHub repo to App Hosting
5. Deploy from `main`

This gives you:

- HTTPS by default
- automatic redeploy on push
- working geolocation on mobile
- a clean path toward the later attendance-app merge
