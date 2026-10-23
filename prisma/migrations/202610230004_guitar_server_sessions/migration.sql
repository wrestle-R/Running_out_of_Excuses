-- Anonymous capability IDs, with all timing and progress recorded by PostgreSQL.
CREATE TABLE public.blog_guitar_sessions (
  id uuid PRIMARY KEY,
  version text NOT NULL,
  questions jsonb NOT NULL CHECK (jsonb_array_length(questions) = 10),
  options jsonb NOT NULL CHECK (jsonb_array_length(options) = 10),
  question_index smallint NOT NULL DEFAULT 0 CHECK (question_index BETWEEN 0 AND 9),
  answers jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_array_length(answers) <= 10),
  question_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  answered_at timestamptz,
  elapsed_ms integer NOT NULL DEFAULT 0 CHECK (elapsed_ms BETWEEN 0 AND 86400000),
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz
);
CREATE INDEX blog_guitar_sessions_created_at_idx ON public.blog_guitar_sessions (created_at);
ALTER TABLE public.blog_guitar_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_guitar_sessions FROM anon, authenticated;
