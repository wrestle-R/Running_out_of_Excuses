-- A prepared question has no running timer until the player activates it.
-- Existing sessions retain their existing start timestamps and behaviour.
ALTER TABLE public.blog_guitar_sessions ALTER COLUMN question_started_at DROP NOT NULL;
