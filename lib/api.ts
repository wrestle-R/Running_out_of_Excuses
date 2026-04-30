import type { RunActivity, RunsPage, SyncResult, TimelineYearSummary } from "@/types";

type RequestJsonOptions = RequestInit & {
  errorMessage: string;
  retries?: number;
};

const RETRY_DELAY_MS = 250;

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

export async function fetchRuns() {
  return requestJson<RunActivity[]>("/api/runs", {
    cache: "no-store",
    errorMessage: "Unable to load runs",
  });
}

export async function fetchRunsPage({
  cursor,
  limit = 24,
}: {
  cursor?: string | null;
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams({ limit: String(limit) });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return requestJson<RunsPage>(`/api/runs/feed?${searchParams.toString()}`, {
    cache: "no-store",
    errorMessage: "Unable to load runs",
  });
}

export async function fetchTimelineYear(year: number) {
  return requestJson<TimelineYearSummary>(`/api/timeline?year=${encodeURIComponent(String(year))}`, {
    cache: "no-store",
    errorMessage: "Unable to load timeline",
  });
}

export async function syncLatestRuns() {
  return requestJson<SyncResult>("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    errorMessage: "Unable to sync runs",
    retries: 0,
  });
}
