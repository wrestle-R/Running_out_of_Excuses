import type { RunActivity, SyncResult } from "@/types";

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

export async function syncLatestRuns() {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return readJson<SyncResult>(response);
}
