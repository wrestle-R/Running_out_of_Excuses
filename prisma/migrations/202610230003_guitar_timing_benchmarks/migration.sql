-- Keep legacy runs; timed cohorts and labelled samples are separate.
ALTER TABLE public.blog_guitar_leaderboard
  ADD COLUMN elapsed_ms integer CHECK (elapsed_ms BETWEEN 0 AND 86400000),
  ADD COLUMN benchmark_runs integer NOT NULL DEFAULT 0 CHECK (benchmark_runs >= 0);
CREATE INDEX blog_guitar_leaderboard_version_score_time_idx
  ON public.blog_guitar_leaderboard (version, score, elapsed_ms);
CREATE TABLE public.blog_guitar_benchmarks (
  version text NOT NULL,
  sample_id smallint NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  elapsed_ms integer NOT NULL CHECK (elapsed_ms BETWEEN 0 AND 86400000),
  PRIMARY KEY (version, sample_id)
);
ALTER TABLE public.blog_guitar_benchmarks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_guitar_benchmarks FROM anon, authenticated;
