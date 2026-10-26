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

## Running data

The public site reads saved activities from the shared PostgreSQL database.
The `/refresh` page and public refresh links have been removed. Runny analytics
and CSV exports with saved splits remain available in Personal-Admin.

The retained server sync endpoints require a server-side `REFRESH_PAGE_PASSWORD`
and an authenticated session; they are not exposed through page controls.

## Spotify for the blog

Spotify endpoints are hosted here under `/api/blogs/spotify/`. The Astro blog's
`PUBLIC_RUNBLOG_API_BASE_URL` points at this server; its Spotify pages default to
`http://127.0.0.1:3000` during development and `https://runny.russel.is-a.dev` in production.
Run the blog on a different port while completing Spotify login, because the
registered OAuth callback uses port 1234.
Open the blog at `http://localhost:1235` when testing on port 1235; its existing
navigation URL helper does not handle `127.0.0.1` as the blog hostname.

Set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`, and
`SPOTIFY_PLAYLIST_ID` in your local and deployment environments. These are server
secrets; never prefix them with `NEXT_PUBLIC_` or put them in the Astro environment.
Search/track metadata need the client credentials. Listening data and playlist
contents/edits also require the owner's refresh token.

To obtain a fresh refresh token:

1. Add exactly `http://127.0.0.1:1234/callback` as a redirect URI in the Spotify
   app's Developer Dashboard. Use `127.0.0.1`, not `localhost`.
2. Run `npm run spotify:authorize` from this directory and open the printed login URL.
3. Sign in to the owner account and approve the requested music permissions.
   The callback saves the token to `.env.local` and existing `.env.prod`, without
   printing it. No playlist is changed during login.
4. Restart Next.js. For production, copy these server variables into the actual
   deployment environment and restart/redeploy both Runny and the blog.

Use `npm run spotify:authorize -- --env-file .env.local` to save only locally.
`.env.prod` is a deployment helper file; Next.js does not automatically load it.
For Spotify Development Mode, the owner needs Premium and must be an allowed app
user. The configured playlist must belong to that account or be collaborative.

The migration uses Spotify's current `/playlists/{id}/items` endpoints and accepts
both old `track` and new `item` response fields. Token and GET caches reduce Spotify
requests; missing/revoked authorization returns `503 SPOTIFY_AUTH_REQUIRED`, while
rate limits retain `429` and `Retry-After`. The status route never returns tokens.
Playlist edits and manual refreshes use `playlist-tracks?force=1` to bypass stale
read caches across separate server instances.

Song submissions accept the two known blog origins and the Runny origin. Add other
production blog origins to comma-separated `SPOTIFY_ALLOWED_ORIGINS`. Removal needs
the signed `deleteToken` returned when a song is added, which the blog saves in that
browser. Old localStorage IDs alone cannot authorize deletion. Write limits and
duplicate-request locking are per server process, not a distributed guarantee.

Official references: [Spotify OAuth](https://developer.spotify.com/documentation/web-api/tutorials/code-flow),
[redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri),
and [2026 playlist migration](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).
