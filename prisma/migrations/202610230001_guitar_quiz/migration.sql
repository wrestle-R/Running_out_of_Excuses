-- Additive migration: leaves existing blog/running tables untouched.
CREATE TABLE IF NOT EXISTS public.blog_guitar_leaderboard (
  run_id uuid PRIMARY KEY,
  version text NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 5),
  total smallint NOT NULL DEFAULT 5 CHECK (total = 5),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'array' AND jsonb_array_length(answers) = 5),
  percentile smallint CHECK (percentile BETWEEN 0 AND 100),
  previous_runs integer NOT NULL CHECK (previous_runs >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_guitar_leaderboard_version_score_idx
  ON public.blog_guitar_leaderboard (version, score);
ALTER TABLE public.blog_guitar_leaderboard ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_guitar_leaderboard FROM anon, authenticated;
