CREATE TABLE IF NOT EXISTS "BlogPostViews" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPostViews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlogPostViews_slug_key" ON "BlogPostViews"("slug");

INSERT INTO "BlogPostViews" ("id", "slug", "title", "views", "createdAt", "updatedAt")
VALUES
  ('seed-voices-told-me-to-write', 'voices-told-me-to-write', 'So the Voices Told Me to Write This', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-not-accept-defeat', 'not-accept-defeat', 'How Not to Accept Defeat 101', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-sitcoms', 'sitcoms', 'Sitcoms', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-munnar-trip', 'munnar-trip', 'Munnar should be spelt ''Moonar''', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-linux-experience', 'linux-experience', 'The Linux Experience', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-6-1-10-human-being', '6-1-10-human-being', '6''1/10 human being', 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-20-days-before-21', '20-days-before-21', '20 days before 21', 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-the-long-stride', 'the-long-stride', 'The Long Stride', 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title";
