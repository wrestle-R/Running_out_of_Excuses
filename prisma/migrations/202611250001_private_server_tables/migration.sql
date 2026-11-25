-- Runny and Personal-Admin use a server PostgreSQL connection for these tables.
-- Existing databases may still have Supabase's API-role default grants.
ALTER TABLE IF EXISTS public."Runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."TimelineData" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."BlogPostViews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."NewsletterSubscribers" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Runs', 'TimelineData', 'BlogPostViews', 'NewsletterSubscribers']
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    END IF;
  END LOOP;
END;
$$;
