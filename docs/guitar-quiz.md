# Guitar quiz

The Blog uses a200-song playable bank (v4), drawn only from the owner's supplied lists and top-song selection. Each quiz asks ten unique songs with four answer choices. The ordered database list remains199tracks; the233-identity master catalogue also keeps older selections and pending titles. Only200registered arrangements are playable. Supabase arrangement links match the registry.

## Server-owned sessions and timing

- `POST /api/blogs/guitar/session` creates an anonymous UUID-capability session and returns its first question. The server selects the questions and choices.
- `POST /api/blogs/guitar/session/:runId/answer` accepts only `{questionNumber, answerId}`. The server checks that the question is current and the choice belongs to it, records the answer and stops that question's clock.
- `POST /api/blogs/guitar/session/:runId/next` accepts only `{questionNumber}` for the answered question. It issues the next question and starts its server clock. A retry returns the same question without resetting its timestamp.

PostgreSQL `clock_timestamp()` measures each question from issuance to answer receipt. Time between an accepted answer and requesting the next question is excluded. Replay/Stop do not reset or pause the question clock. All timestamps, accumulated duration, progress, score and percentile are server-owned. Client timing/score/pool fields are rejected; the legacy result endpoint rejects all v4 submissions. Changing Date/performance clocks in a browser or posting a fabricated elapsedMs does not change saved timing.

This is server-authoritative timing, not a claim to prevent all automated answering or source inspection in an anonymous web game. Network and request-processing time is included. Sessions expire after24hours. No timer is shown in the UI. The start page briefly explains ten riffs, four choices, replays, score priority and faster answers breaking ties; it does not advertise catalogue counts or transcription details.

Question rows are locked during answer/advance actions. Identical answer retries retain the original answer, time and result snapshot; a changed answer returns409. A completed session and its scored result commit in the same transaction. Timed results rank by score descending, then elapsed milliseconds ascending; exactly equal score/time receives midrank tie credit. A global advisory transaction lock serializes comparison/insertion across instances.

## Sample benchmarks

The owner requested dummy comparison data. `scripts/seed-guitar-benchmarks.mjs` creates200deterministic sample results in a separate RLS table, never fictional human accounts or entries in the real-run table. v4 percentiles combine those benchmarks with previous real completed v4 sessions. API snapshots distinguish previousRuns from benchmarkRuns. UI wording calls this a quiz benchmark and does not claim an invented number of human players. The seed is repeatable and preserves real runs.

## Legacy compatibility

`POST /api/blogs/guitar/result` remains available for v1/v2 five-answer and v3 ten-answer frontends. It calculates scores from answer IDs, canonicalizes order, validates unique eligible questions, and returns the original comparison snapshot on retry. v4 cannot bypass session timing through this endpoint. Percentile cohorts are separated by version, so old scores/timing do not compete with the expanded timed game.

## Database setup

Apply additive migrations in order using the existing server connection. Do not reset existing tables:

1. `202610230001_guitar_quiz` creates the anonymous results table and RLS.
2. `202610230002_guitar_song_list_ten_questions` creates master/list tables and permits five/ten-answer runs.
3. `202610230003_guitar_timing_benchmarks` adds elapsed-time/sample snapshot columns and separate benchmark records.
4. `202610230004_guitar_server_sessions` creates server-owned question/timing/session state.

Then run, with this project's existing environment loaded:

```sh
node --env-file=.env.local scripts/seed-guitar-songs.mjs
node --env-file=.env.local scripts/seed-guitar-benchmarks.mjs
```

Both migrations and seeds were applied to the configured Supabase database. All guitar tables have RLS enabled and deny direct anonymous/authenticated Supabase-role access. Existing server credentials perform queries. No new environment variables or environment-file edits are required.

The song seed upserts233master identities and transactionally replaces only the199-position owner-selection list. It derives arrangement availability from repertoire.currentVersion and retains runs, other lists and legacy identities. `GET /api/blogs/guitar/songs` returns that ordered list with its real count and playable flags.

## Source and release checks

`services/blogs/guitar/repertoire.json` pins version-specific IDs, counts and confuser lists synchronized from the Blog. The frontend holds199local notation excerpts plus the separately scored GoT arrangement.33tabs are marked as automated transcriptions; the Blog source notes explicitly distinguish those from contributor notation and describe arrangement limits. Do not call every clip human-transcribed or studio-perfect.

Deploy the backend before the matching Blog frontend. Verify unit/build checks, independent notation audit, all200actual Web Audio schedules, the full ten-question browser flow, retry/failure paths, server-time bypass rejection, and public endpoint behavior. Remove only generated verification session/result UUIDs afterward; retain sample benchmarks and real users' runs.
