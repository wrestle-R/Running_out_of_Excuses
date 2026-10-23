-- Keep old five-question runs valid while accepting versioned ten-question runs.
ALTER TABLE public.blog_guitar_leaderboard
  DROP CONSTRAINT blog_guitar_leaderboard_score_check,
  DROP CONSTRAINT blog_guitar_leaderboard_total_check,
  DROP CONSTRAINT blog_guitar_leaderboard_answers_check,
  ADD CONSTRAINT blog_guitar_leaderboard_score_check CHECK (score >= 0 AND score <= total),
  ADD CONSTRAINT blog_guitar_leaderboard_total_check CHECK (total IN (5, 10)),
  ADD CONSTRAINT blog_guitar_leaderboard_answers_check
    CHECK (jsonb_typeof(answers) = 'array' AND jsonb_array_length(answers) = total);

CREATE TABLE IF NOT EXISTS public.blog_guitar_songs (
  id text PRIMARY KEY,
  title text NOT NULL,
  artist text NOT NULL,
  arrangement_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.blog_guitar_song_list (
  list_id text NOT NULL,
  position smallint NOT NULL CHECK (position > 0),
  song_id text NOT NULL REFERENCES public.blog_guitar_songs(id),
  PRIMARY KEY (list_id, position),
  UNIQUE (list_id, song_id)
);
ALTER TABLE public.blog_guitar_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_guitar_song_list ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_guitar_songs, public.blog_guitar_song_list FROM anon, authenticated;
