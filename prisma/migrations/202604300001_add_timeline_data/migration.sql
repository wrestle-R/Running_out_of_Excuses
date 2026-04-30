CREATE TABLE IF NOT EXISTS "TimelineData" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "totalRuns" INTEGER NOT NULL,
  "totalDistanceKm" DOUBLE PRECISION NOT NULL,
  "topRuns" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimelineData_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TimelineData_year_month_key" ON "TimelineData"("year", "month");
CREATE INDEX IF NOT EXISTS "TimelineData_year_idx" ON "TimelineData"("year");
