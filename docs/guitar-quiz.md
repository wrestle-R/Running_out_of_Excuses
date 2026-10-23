# Guitar quiz results

`POST /api/blogs/guitar/result` saves anonymous five-question runs in the existing PostgreSQL database. It accepts `{runId, version, answers: [{songId, answerId}]}` and returns `{percentile, previousRuns}`. There are no names, public leaderboard or browser-local comparison statistics.

Scores are calculated from the submitted answer IDs. Only five distinct, registered questions are accepted. Repeating an identical run ID returns its original comparison; changing the answers under that ID returns 409. An advisory transaction lock makes the comparison and insertion atomic across server instances. Percentiles use previous runs in the same repertoire version, with half credit for tied scores. The first run returns `null`.

The additive SQL in `prisma/migrations/202610230001_guitar_quiz/migration.sql` creates `public.blog_guitar_leaderboard`, its version/score index and row-level security. Anonymous and authenticated Supabase roles have no direct table access. The existing server database connection performs the writes. This migration was applied to the configured database on 2026-10-23; existing running/blog tables were not changed. No new environment variables are needed.

For another environment, apply only that SQL file using the established database credentials, for example `npx prisma db execute --file prisma/migrations/202610230001_guitar_quiz/migration.sql --schema prisma/schema.prisma`. Do not reset the database. Keep credentials out of source control.

`services/blogs/guitar/repertoire.json` contains accepted question and answer IDs. Version v1 preserves the original five-song frontend; v2 matches the expanded Blog bank. When changing eligible arrangements in the Blog repository, synchronize this manifest and use a new version for a changed question pool so its percentile cohort stays separate. The Blog's production API base remains the existing Run_blog host; local Astro development uses port 3000. Deploy the backend route before publishing the v2 frontend.

Validation: route/service tests cover malformed bodies, duplicate questions, oversized streamed requests, unknown IDs, response privacy and persistence failures. Database integration checks exercised insert/retry/conflict/ties/concurrent retries; generated test rows were deleted afterward.
