import type { RunActivity, RunsPage, SyncResult, TimelineYearSummary } from "@/types";

type RequestJsonOptions = RequestInit & {
  errorMessage: string;
  retries?: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const RETRY_DELAY_MS = 250;
const RUNS_CACHE_TTL_MS = 60 * 1000;
const TIMELINE_CACHE_TTL_MS = 5 * 60 * 1000;
const RUNS_CACHE_KEY_PREFIX = "run_blog:runs_feed:";
const TIMELINE_CACHE_KEY_PREFIX = "run_blog:timeline_year:";
const RUNS_ALL_CACHE_KEY = "run_blog:runs_all";

function isBrowser() {
  return typeof window !== "undefined";
}

function getCacheEntry<T>(key: string): CacheEntry<T> | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function getValidCachedValue<T>(key: string) {
  const entry = getCacheEntry<T>(key);
  if (!entry) return null;

  if (entry.expiresAt < Date.now()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
    return null;
  }

  return entry.value;
}

function getStaleCachedValue<T>(key: string) {
  const entry = getCacheEntry<T>(key);
  return entry?.value ?? null;
}

function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  if (!isBrowser()) return;

  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore quota/storage errors.
  }
}

class HttpStatusError extends Error {
  status: number;

  constructor(status: number) {
    super(`HTTP_${status}`);
    this.status = status;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof HttpStatusError &&
      (error.status >= 500 || error.status === 429 || error.status === 408))
  );
}

async function readJson<T>(response: Response, errorMessage: string): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    if (response.status >= 500 || response.status === 429 || response.status === 408) {
      throw new HttpStatusError(response.status);
    }

    throw new Error(errorMessage);
  }

  return data as T;
}

async function requestJson<T>(
  input: RequestInfo | URL,
  { errorMessage, retries = 2, ...init }: RequestJsonOptions
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(input, init);
      return await readJson<T>(response, errorMessage);
    } catch (error) {
      lastError = error;

      if (attempt === retries || !shouldRetry(error)) {
        throw new Error(errorMessage);
      }

      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(errorMessage);
}

function buildRunsPageCacheKey(cursor?: string | null, limit = 24) {
  return `${RUNS_CACHE_KEY_PREFIX}limit=${limit}:cursor=${cursor ?? "none"}`;
}

function clearCachedPrefix(prefix: string) {
  if (!isBrowser()) return;

  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage access errors.
  }
}

function invalidateRunCaches() {
  clearCachedPrefix(RUNS_CACHE_KEY_PREFIX);
  clearCachedPrefix(TIMELINE_CACHE_KEY_PREFIX);

  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(RUNS_ALL_CACHE_KEY);
  } catch {
    // Ignore storage access errors.
  }
}

export async function fetchRuns() {
  const cacheKey = RUNS_ALL_CACHE_KEY;
  const cached = getValidCachedValue<RunActivity[]>(cacheKey);
  if (cached) return cached;

  try {
    const runs = await requestJson<RunActivity[]>("/api/runs", {
      cache: "no-store",
      errorMessage: "Unable to load runs",
    });
    setCachedValue(cacheKey, runs, RUNS_CACHE_TTL_MS);
    return runs;
  } catch (error) {
    const stale = getStaleCachedValue<RunActivity[]>(cacheKey);
    if (stale) return stale;
    throw error;
  }
}

export async function fetchRunsPage({
  cursor,
  limit = 24,
}: {
  cursor?: string | null;
  limit?: number;
} = {}) {
  const cacheKey = buildRunsPageCacheKey(cursor, limit);
  const cached = getValidCachedValue<RunsPage>(cacheKey);
  if (cached) return cached;

  const searchParams = new URLSearchParams({ limit: String(limit) });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  try {
    const page = await requestJson<RunsPage>(`/api/runs/feed?${searchParams.toString()}`, {
      cache: "no-store",
      errorMessage: "Unable to load runs",
    });
    setCachedValue(cacheKey, page, RUNS_CACHE_TTL_MS);
    return page;
  } catch (error) {
    const stale = getStaleCachedValue<RunsPage>(cacheKey);
    if (stale) return stale;
    throw error;
  }
}

export async function fetchTimelineYear(year: number) {
  const cacheKey = `${TIMELINE_CACHE_KEY_PREFIX}${year}`;
  const cached = getValidCachedValue<TimelineYearSummary>(cacheKey);
  if (cached) return cached;

  try {
    const summary = await requestJson<TimelineYearSummary>(
      `/api/timeline?year=${encodeURIComponent(String(year))}`,
      {
        cache: "no-store",
        errorMessage: "Unable to load timeline",
      }
    );
    setCachedValue(cacheKey, summary, TIMELINE_CACHE_TTL_MS);
    return summary;
  } catch (error) {
    const stale = getStaleCachedValue<TimelineYearSummary>(cacheKey);
    if (stale) return stale;
    throw error;
  }
}

export async function syncLatestRuns() {
  const result = await requestJson<SyncResult>("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    errorMessage: "Unable to sync runs",
    retries: 0,
  });

  invalidateRunCaches();
  return result;
}
