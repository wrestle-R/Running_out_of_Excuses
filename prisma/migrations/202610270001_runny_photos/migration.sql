CREATE TABLE IF NOT EXISTS public.runny_photos (
  id uuid PRIMARY KEY,
  url text NOT NULL,
  public_id text UNIQUE,
  alt text NOT NULL CHECK (length(alt) BETWEEN 1 AND 240),
  caption text NOT NULL DEFAULT '' CHECK (length(caption) <= 1000),
  placement text NOT NULL CHECK (placement IN ('gallery', 'timeline')),
  year integer,
  month integer,
  position integer NOT NULL CHECK (position >= 0),
  deleted_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz(3) NOT NULL DEFAULT now(),
  CHECK ((placement = 'gallery' AND year IS NULL AND month IS NULL)
    OR (placement = 'timeline' AND year BETWEEN 2025 AND 2100 AND month BETWEEN 1 AND 12))
);
CREATE INDEX IF NOT EXISTS runny_photos_placement_idx ON public.runny_photos(placement, year, month, position);
ALTER TABLE public.runny_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.runny_photos FROM anon, authenticated;
