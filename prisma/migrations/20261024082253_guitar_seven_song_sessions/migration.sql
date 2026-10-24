-- Reuse existing sessions/results. Preserve all historical five/ten-song runs.
ALTER TABLE public.blog_guitar_leaderboard
  DROP CONSTRAINT blog_guitar_leaderboard_total_check,
  ADD CONSTRAINT blog_guitar_leaderboard_total_check CHECK (total IN (5,7,10));
ALTER TABLE public.blog_guitar_sessions
  DROP CONSTRAINT blog_guitar_sessions_questions_check,
  DROP CONSTRAINT blog_guitar_sessions_options_check,
  DROP CONSTRAINT blog_guitar_sessions_question_index_check,
  DROP CONSTRAINT blog_guitar_sessions_answers_check,
  ADD CONSTRAINT blog_guitar_sessions_questions_check CHECK (
    jsonb_typeof(questions)='array' AND
    ((version='v4' AND jsonb_array_length(questions)=10) OR (version='v5' AND jsonb_array_length(questions)=7))),
  ADD CONSTRAINT blog_guitar_sessions_options_check CHECK (
    jsonb_typeof(options)='array' AND jsonb_array_length(options)=jsonb_array_length(questions)),
  ADD CONSTRAINT blog_guitar_sessions_question_index_check CHECK (
    question_index>=0 AND question_index<jsonb_array_length(questions)),
  ADD CONSTRAINT blog_guitar_sessions_answers_check CHECK (
    jsonb_typeof(answers)='array' AND jsonb_array_length(answers)<=jsonb_array_length(questions));

-- The full theme remains a frontend homepage Easter egg, outside the quiz.
DELETE FROM public.blog_guitar_song_list WHERE song_id='thrones';
DELETE FROM public.blog_guitar_songs WHERE id='thrones';
