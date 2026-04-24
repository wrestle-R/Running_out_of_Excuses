import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { RunActivity, RunSplit } from "@/types";
import type { NormalizedStravaActivity } from "@/lib/server/strava";

function asSplitArray(value: Prisma.JsonValue): RunSplit[] {
  return Array.isArray(value) ? (value as RunSplit[]) : [];
}

function nullableFloat(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  for (const activity of activities) {
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
    total: activities.length,
    succeeded,
    failed,
    inserted,
    updated: succeeded - inserted,
  };
}
