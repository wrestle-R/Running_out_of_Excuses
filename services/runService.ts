import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { RunActivity, RunSplit } from "@/types";
import type { NormalizedStravaActivity } from "@/lib/server/strava";

type RunDuplicateRecord = {
  id: string;
  stravaId: bigint;
  sportType: string | null;
  startDate: Date;
  distanceKm: number;
  elapsedTimeMin: number;
  raw: Prisma.JsonValue | null;
  createdAt: Date;
};

function asSplitArray(value: Prisma.JsonValue): RunSplit[] {
  return Array.isArray(value) ? (value as RunSplit[]) : [];
}

function nullableFloat(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isLegacyCsvRun(run: Pick<RunDuplicateRecord, "stravaId" | "raw">) {
  const source = isJsonObject(run.raw) ? run.raw.source : null;
  const syntheticCsvIdStart = BigInt("8000000000000000");
  const syntheticCsvIdEnd = BigInt("9000000000000000");

  return (
    source === "csv" &&
    run.stravaId >= syntheticCsvIdStart &&
    run.stravaId < syntheticCsvIdEnd
  );
}

function getRunDateKey(run: Pick<RunDuplicateRecord, "startDate" | "raw">) {
  const rawStartDateLocal = isJsonObject(run.raw) ? run.raw.start_date_local : null;

  if (typeof rawStartDateLocal === "string" && rawStartDateLocal.length >= 10) {
    return rawStartDateLocal.slice(0, 10);
  }

  return run.startDate.toISOString().slice(0, 10);
}

function duplicateKey(
  run: Pick<
    RunDuplicateRecord,
    "sportType" | "startDate" | "distanceKm" | "elapsedTimeMin" | "raw"
  >
) {
  const sportType = (run.sportType || "").trim().toLowerCase();
  const day = getRunDateKey(run);
  const distanceKm = run.distanceKm.toFixed(2);
  const elapsedTimeMin = run.elapsedTimeMin.toFixed(1);

  return `${sportType}|${day}|${distanceKm}|${elapsedTimeMin}`;
}

export function getLegacyCsvDuplicateIds(runs: RunDuplicateRecord[]) {
  const groups = new Map<string, { legacyCsv: RunDuplicateRecord[]; canonical: RunDuplicateRecord[] }>();

  for (const run of runs) {
    const key = duplicateKey(run);
    const group = groups.get(key) ?? { legacyCsv: [], canonical: [] };

    if (isLegacyCsvRun(run)) {
      group.legacyCsv.push(run);
    } else {
      group.canonical.push(run);
    }

    groups.set(key, group);
  }

  const duplicateIds: string[] = [];

  for (const group of groups.values()) {
    if (group.canonical.length > 0) {
      duplicateIds.push(...group.legacyCsv.map((run) => run.id));
      continue;
    }

    if (group.legacyCsv.length > 1) {
      const sortedLegacyRuns = [...group.legacyCsv].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      duplicateIds.push(...sortedLegacyRuns.slice(1).map((run) => run.id));
    }
  }

  return duplicateIds;
}

export function toRunActivity(run: {
  id: string;
  stravaId: bigint;
  name: string;
  sportType: string | null;
  startDate: Date;
  distanceKm: number;
  elapsedTimeMin: number;
  averageSpeedKmph: number | null;
  paceMinPerKm: number | null;
  pace: string | null;
  description: string | null;
  splits: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): RunActivity {
  const stravaId = run.stravaId.toString();

  return {
    id: stravaId,
    stravaId,
    name: run.name,
    sportType: run.sportType,
    date: run.startDate.toISOString(),
    distance_km: run.distanceKm,
    elapsed_time_min: run.elapsedTimeMin,
    average_speed_kmph: run.averageSpeedKmph,
    pace_min_per_km: run.paceMinPerKm,
    pace: run.pace,
    description: run.description,
    splits: asSplitArray(run.splits),
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

export async function listRuns() {
  const runs = await prisma.run.findMany({
    orderBy: { startDate: "desc" },
  });

  return runs.map(toRunActivity);
}

export async function countRuns() {
  return prisma.run.count();
}

export async function removeLegacyCsvDuplicates() {
  const runs = await prisma.run.findMany({
    select: {
      id: true,
      stravaId: true,
      sportType: true,
      startDate: true,
      distanceKm: true,
      elapsedTimeMin: true,
      raw: true,
      createdAt: true,
    },
  });
  const duplicateIds = getLegacyCsvDuplicateIds(runs);

  if (duplicateIds.length === 0) {
    return { removed: 0 };
  }

  const result = await prisma.run.deleteMany({
    where: {
      id: { in: duplicateIds },
    },
  });

  return { removed: result.count };
}

export async function upsertRun(activity: NormalizedStravaActivity) {
  const paceMinPerKm = nullableFloat(activity.pace_min_per_km);
  const data = {
    stravaId: BigInt(activity.id),
    name: activity.name,
    sportType: activity.sportType,
    startDate: new Date(activity.date),
    distanceKm: activity.distance_km,
    elapsedTimeMin: activity.elapsed_time_min,
    averageSpeedKmph: activity.average_speed_kmph,
    paceMinPerKm,
    pace: activity.pace,
    description: activity.description,
    splits: activity.splits as Prisma.InputJsonValue,
    raw: activity.raw as Prisma.InputJsonValue,
  };
  const updateData = { ...data };

  if (activity.splits.length === 0) {
    delete (updateData as Partial<typeof updateData>).splits;
  }

  const existing = await prisma.run.findUnique({
    where: { stravaId: data.stravaId },
    select: { id: true },
  });

  const run = await prisma.run.upsert({
    where: { stravaId: data.stravaId },
    create: data,
    update: updateData,
  });

  return {
    run,
    created: !existing,
  };
}

export async function upsertRuns(activities: NormalizedStravaActivity[]) {
  let succeeded = 0;
  let failed = 0;
  let inserted = 0;
  const uniqueActivities = Array.from(
    new Map(activities.map((activity) => [String(activity.id), activity])).values()
  );

  for (const activity of uniqueActivities) {
    try {
      const result = await upsertRun(activity);
      succeeded += 1;
      if (result.created) {
        inserted += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`Failed to upsert Strava activity ${activity.id}:`, error);
    }
  }

  return {
    total: uniqueActivities.length,
    succeeded,
    failed,
    inserted,
    updated: succeeded - inserted,
  };
}
