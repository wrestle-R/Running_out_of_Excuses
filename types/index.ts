export type RunSplit = {
  km?: number | string | null;
  distance?: number | null;
  pace_min_per_km?: string | number | null;
  elapsed_time?: number | null;
  average_speed?: number | null;
  pace?: string | null;
  pace_zone?: number | null;
  time?: string | null;
};

export type RunActivity = {
  id: string;
  stravaId?: string;
  name: string;
  sportType?: string | null;
  date: string;
  distance_km: number;
  elapsed_time_min: number;
  average_speed_kmph?: number | null;
  pace_min_per_km?: string | number | null;
  pace?: string | null;
  description?: string | null;
  splits: RunSplit[];
  createdAt?: string;
  updatedAt?: string;
};

export type SyncResult = {
  message?: string;
  fetched: number;
  total: number;
  succeeded: number;
  failed: number;
  inserted?: number;
  updated?: number;
  totalCount?: number;
  newCount?: number;
  removedDuplicateCsvRuns?: number;
};

export type RunsPage = {
  runs: RunActivity[];
  nextCursor: string | null;
  totalRuns: number;
  totalDistanceKm: number;
};

export type TimelineTopRun = {
  id: string;
  name: string;
  distance_km: number;
  date: string;
};

export type TimelineMonthSummary = {
  year: number;
  month: number;
  totalRuns: number;
  totalDistanceKm: number;
  topRuns: TimelineTopRun[];
};

export type TimelineYearSummary = {
  year: number;
  months: TimelineMonthSummary[];
};

export type ServerEnv = {
  STRAVA_CLIENT_ID?: string;
  STRAVA_CLIENT_SECRET?: string;
  STRAVA_REFRESH_TOKEN?: string;
};
