# Guitar songs and quiz results

`POST /api/blogs/guitar/result` saves anonymous runs in the existing PostgreSQL database. It accepts `{runId, version, answers: [{songId, answerId}]}` and returns `{percentile, previousRuns}`. Version v3 requires ten distinct registered questions; v1 and v2 continue to accept five for older frontends. Scores are calculated on the server. There are no names or public leaderboard.

Repeating an identical run ID returns its original comparison snapshot; changing the version or answers under that ID returns 409. Answers are sorted into canonical question order. A PostgreSQL advisory transaction lock makes comparison and insertion atomic across server instances. Percentiles use previous runs of the same version, with half credit for tied scores. The first run returns `null`, rather than an invented percentile.

`GET /api/blogs/guitar/songs` returns `{listId, count, songs: [{position, id, title, artist, playable}]}` from the database in the supplied order. `owner-selection` contains exactly 199 tracks, as confirmed by the owner. The master song table preserves 233 unique identities, including older requests outside that list. Titles shared by different artists have separate IDs. `playable` describes an existing reviewed clip, not the presence of a title in the catalogue. There are 43 eligible arrangements across the master catalogue; remaining tracks await notation and timing verification.

## Database setup

Apply the additive migrations in order with the established database credentials. Do not reset the database:

1. `prisma/migrations/202610230001_guitar_quiz/migration.sql` creates `public.blog_guitar_leaderboard`, its version/score index and row-level security.
2. `prisma/migrations/202610230002_guitar_song_list_ten_questions/migration.sql` permits totals of five or ten, checks the answer count against the total, and creates `public.blog_guitar_songs` and `public.blog_guitar_song_list`.

For example, use `npx prisma db execute --file <migration-path> --schema prisma/schema.prisma` with this project's environment loaded. Then run:

```sh
node --env-file=.env.local scripts/seed-guitar-songs.mjs
```

The seed validates the exact 199-track list, upserts master metadata and replaces only the `owner-selection` membership in one transaction. It retains legacy songs, other lists and quiz results, and can be rerun safely. Both migrations and this seed were applied to the configured Supabase database on 2026-10-23. Existing blog and running tables were not changed. No new environment variables are required.

All three guitar tables have RLS enabled, and the Supabase anonymous and authenticated roles have no direct table privileges. Existing server database credentials perform queries. Credentials and real environment files must stay out of source control.

## Keeping the frontends compatible

`services/blogs/guitar/repertoire.json` records accepted question IDs, question counts and answer IDs. v1 preserves the original bank, v2 the expanded bank, and v3 uses that same 43-clip bank with ten questions. The new version separates five- and ten-question percentile cohorts. Synchronize eligible arrangements with the Blog repository and increment the version when the question pool or quiz length changes.

`services/blogs/guitar/song-list.json` is the exact ordered owner list; `song-catalogue.json` retains the combined master list. The Blog keeps the matching list in `src/lib/guitar-song-list.json`. Production uses the existing Run_blog API host, while local Astro development uses port 3000. Deploy this backend before publishing the ten-question Blog frontend.

Validation covers malformed bodies, duplicate questions, wrong version-specific counts, unknown IDs, oversized streamed requests, response privacy and database failures. Real-database checks verify ordered song identities, ten-answer storage, server scoring, retry snapshots, legacy compatibility and RLS. Browser checks complete all ten rounds against the real local API. Generated verification rows are removed afterward.
