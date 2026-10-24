# Guitar quiz

The Blog asks **seven unique songs** from 199 local guitar reductions. Game of Thrones is excluded from quiz questions, choices and the database song catalogue. Its full theme remains a homepage endurance Easter egg.

## Existing sessions, results and benchmarks

The existing `blog_guitar_sessions`, `blog_guitar_leaderboard` and `blog_guitar_benchmarks` tables are reused. No new database or table is introduced. New clients request `{version:"v5"}`; old clients using `{}` retain ten-song v4 sessions. Existing five/ten-song result records stay intact. Migration `20261024082253_guitar_seven_song_sessions` extends the existing constraints to seven songs.

Percentiles reuse historical results and the 200 existing labelled sample benchmarks. Compare accuracy by cross multiplication (`score / total`), then elapsed time per song where timing exists. An older untimed result receives midrank tie credit at the same accuracy. The current run is excluded from its comparison. Sample benchmarks remain separate from real completed plays. The displayed completed-plays count is `max(8, previousRuns + 1)`, per the owner's requested display floor; it does not create fake result records.

## Server authority and retries

- `POST /api/blogs/guitar/session` creates the anonymous UUID-capability session and returns its first question.
- `POST /api/blogs/guitar/session/:runId/answer` accepts `{questionNumber, answerId}` only. PostgreSQL records progress and elapsed time.
- `POST /api/blogs/guitar/session/:runId/next` accepts `{questionNumber}` for the answered question. It starts the next clock. Retry returns the same question without resetting its timestamp.

Normal answers and next actions each use a single atomic locking SQL statement to reduce database round trips. The final answer, result, percentile snapshot and session completion still commit in one transaction. Conflicting answer retries return 409; identical retries preserve original timing and feedback. Sessions expire after 24 hours. Direct timed `/result` submissions remain rejected. No browser clocks, scores or question pools are trusted.

The two-second feedback pause happens after a saved answer and before requesting the next question, outside scored question time. It also precedes the final result. Network latency can require additional loading time. All guitar tables retain RLS and deny direct anonymous/authenticated role access.

## Frontend and audio

Scores are static `/guitar-riffs/:id.json` assets, loaded only for the selected riff. The homepage uses `thrones-intro.json`. No song recordings or audio libraries are downloaded for playback. Bounded synthesized-note buffers are reused; preparation yields between batches so loading motion remains responsive. Audio stops on navigation/tab hiding. The note events include string, pitch label and fret for the portrait string display.

The quiz has one Play/Playing/Replay control, a music-themed loader, a sticker Next button and automatic progression after feedback. Artist details open on hover/focus or a dedicated mobile info button; optional Spotify cover artwork loads only on demand and never blocks answers. A short portrait orientation popup disappears after 3.5 seconds. The pick uses the shared movable-sticker implementation, including persistence, keyboard movement and Reset.

No environment file changes are needed. Use the existing local backend on port 3000 for frontend development. Publish backend changes before the Blog frontend.

## Background preparation (2026-10-24)

The new frontend creates one `{version:"v5",prepared:true}` session on the intro. Its first question has a null `question_started_at`; no score clock runs while the visitor reads the intro. Only that first score and its synthesized PCM samples are warmed. No AudioContext is started and no sound plays before a gesture.

`POST /api/blogs/guitar/session/:runId/activate` takes `{questionNumber}` and atomically starts that question once. It returns the current question plus exactly one upcoming question (or null on the last). A repeated activation preserves its original timestamp; skipping an unanswered question or answering a dormant question is rejected. Activation of the next question requires the previous saved answer. The existing session table is reused; migration `20261024085432_guitar_prepared_sessions` makes only its start timestamp nullable. Default legacy session creation still starts immediately.

On play, the cached question/audio can appear while activation is acknowledged in the background. Answer controls enable after both playback and activation. During the current riff, the upcoming score and PCM warm in small yielding batches. On answer, local feedback is immediate; server persistence overlaps the existing two-second pause. Advancing still requires a successful server save. Failure rolls back the provisional counter/highlights and allows retrying the same choice. The final percentile is only shown after the server commits it.

Memory remains bounded (up to 64 PCM sample keys and 64 AudioBuffer keys; converted PCM is released). Loading indicators wait 240ms, avoiding flashes on warm transitions. No new dependencies, song recordings, database tables, or environment variables are introduced.
