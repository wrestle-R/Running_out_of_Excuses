import type { RunActivity, RunsPage, SyncResult } from "@/types";

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || response.statusText);
  }

  return data as T;
}

export async function fetchRuns() {
  const response = await fetch("/api/runs", {
    cache: "no-store",
  });

  return readJson<RunActivity[]>(response);
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

  const response = await fetch(`/api/runs/feed?${searchParams.toString()}`, {
    cache: "no-store",
  });

  return readJson<RunsPage>(response);
}

export async function syncLatestRuns() {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return readJson<SyncResult>(response);
}
