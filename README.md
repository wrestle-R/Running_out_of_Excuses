# Run Blog Next

Standalone Next.js version of the running blog with App Router routes implemented inside root `app/`.

## Commands

```sh
npm install
npm test
npm run dev
npm run build
```

The app runs at `http://localhost:3000` by default.

## Refresh access

Copy `.env.example` to `.env.local` and fill in the database and Strava credentials.
Set `REFRESH_PAGE_PASSWORD` to a strong password on the server and in your deployment.
The refresh page checks it through `/api/refresh/auth` and receives an eight-hour,
HttpOnly session cookie. `/api/sync` requires that session and rejects requests from
other origins before accessing Strava or changing any records.

When upgrading, replace the old `NEXT_PUBLIC_REFRESH_PAGE_PASSWORD` deployment
variable with `REFRESH_PAGE_PASSWORD` and redeploy. Choose a new password because
the old public variable was included in browser JavaScript. The local environment
files have been renamed to the new variable; they remain outside Git.
