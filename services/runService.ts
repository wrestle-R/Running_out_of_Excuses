import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  RunActivity,
  RunSplit,
  RunsPage,
  TimelineTopRun,
  TimelineYearSummary,
} from "@/types";
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

type RunCursor = {
  startDate: string;
  id: string;
};

type RunPageRecord = Parameters<typeof toRunActivity>[0];

const DEFAULT_RUN_PAGE_LIMIT = 24;
const MAX_RUN_PAGE_LIMIT = 96;
const MONTHS_IN_YEAR = 12;
const TIMELINE_TOP_RUN_LIMIT = 3;

type TimelineDataRow = {
  year: number;
  month: number;
  totalRuns: number;
  totalDistanceKm: number;
  topRuns: Prisma.JsonValue;
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

function normalizeRunPageLimit(limit?: number) {
  if (!Number.isFinite(limit)) return DEFAULT_RUN_PAGE_LIMIT;
  return Math.min(Math.max(Math.trunc(limit ?? DEFAULT_RUN_PAGE_LIMIT), 1), MAX_RUN_PAGE_LIMIT);
}

function encodeRunCursor(run: Pick<RunPageRecord, "id" | "startDate">) {
  const cursor: RunCursor = {
    id: run.id,
    startDate: run.startDate.toISOString(),
  };

  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeRunCursor(cursor: string | null | undefined): RunCursor | null {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<RunCursor>;

    if (typeof parsed.id !== "string" || typeof parsed.startDate !== "string") {
      return null;
    }

    const startDate = new Date(parsed.startDate);
    if (Number.isNaN(startDate.getTime())) return null;

    return {
      id: parsed.id,
      startDate: startDate.toISOString(),
    };
  } catch {
    return null;
  }
}

function getRunsPageWhere(cursor: string | null | undefined): Prisma.RunWhereInput | undefined {
  const decodedCursor = decodeRunCursor(cursor);

  if (!decodedCursor) return undefined;

  const startDate = new Date(decodedCursor.startDate);

  return {
    OR: [
      { startDate: { lt: startDate } },
      {
        id: { gt: decodedCursor.id },
        startDate,
      },
    ],
  };
}

function emptyTimelineMonth(year: number, month: number) {
  return {
    year,
    month,
    totalRuns: 0,
    totalDistanceKm: 0,
    topRuns: [] as TimelineTopRun[],
  };
}

function parseTopRuns(value: Prisma.JsonValue): TimelineTopRun[] {
  if (!Array.isArray(value)) return [];

  const topRuns: TimelineTopRun[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.id === "string" &&
      typeof record.name === "string" &&
      typeof record.distance_km === "number" &&
      Number.isFinite(record.distance_km) &&
      typeof record.date === "string"
    ) {
      topRuns.push({
        id: record.id,
        name: record.name,
        distance_km: record.distance_km,
        date: record.date,
      });
    }
  }

  return topRuns.slice(0, TIMELINE_TOP_RUN_LIMIT);
}

function timelineMonthFromRow(row: TimelineDataRow) {
  return {
    year: row.year,
    month: row.month,
    totalRuns: row.totalRuns,
    totalDistanceKm: Number(row.totalDistanceKm.toFixed(2)),
    topRuns: parseTopRuns(row.topRuns),
  };
}

async function buildTimelineYearSummaryFromRuns(normalizedYear: number): Promise<TimelineYearSummary> {
  const startDate = new Date(Date.UTC(normalizedYear, 0, 1));
  const endDate = new Date(Date.UTC(normalizedYear + 1, 0, 1));
  const months = Array.from({ length: MONTHS_IN_YEAR }, (_, index) =>
    emptyTimelineMonth(normalizedYear, index + 1)
  );

  const runs = await prisma.run.findMany({
    orderBy: [{ startDate: "desc" }, { id: "asc" }],
    select: {
      stravaId: true,
      name: true,
      startDate: true,
      distanceKm: true,
    },
    where: {
      startDate: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  for (const run of runs) {
    const month = months[run.startDate.getUTCMonth()];
    month.totalRuns += 1;
    month.totalDistanceKm += run.distanceKm;
    month.topRuns.push({
      id: run.stravaId.toString(),
      name: run.name,
      distance_km: run.distanceKm,
      date: run.startDate.toISOString(),
    });
  }

  for (const month of months) {
    month.totalDistanceKm = Number(month.totalDistanceKm.toFixed(2));
    month.topRuns = month.topRuns
      .sort((a, b) => b.distance_km - a.distance_km)
      .slice(0, TIMELINE_TOP_RUN_LIMIT);
  }

  return {
    year: normalizedYear,
    months,
  };
}

async function computeTimelineSummaryByYearMonth(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const runs = await prisma.run.findMany({
    orderBy: [{ distanceKm: "desc" }, { startDate: "desc" }, { id: "asc" }],
    select: {
      stravaId: true,
      name: true,
      startDate: true,
      distanceKm: true,
    },
    where: {
      startDate: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  const topRuns = runs.slice(0, TIMELINE_TOP_RUN_LIMIT).map((run) => ({
    id: run.stravaId.toString(),
    name: run.name,
    distance_km: run.distanceKm,
    date: run.startDate.toISOString(),
  }));
  const totalDistanceKm = Number(
    runs.reduce((sum, run) => sum + run.distanceKm, 0).toFixed(2)
  );

  return {
    year,
    month,
    totalRuns: runs.length,
    totalDistanceKm,
    topRuns,
  };
}

async function upsertTimelineSummaryByYearMonth(year: number, month: number) {
  const summary = await computeTimelineSummaryByYearMonth(year, month);

  await prisma.timelineData.upsert({
    where: { year_month: { year, month } },
    create: {
      year: summary.year,
      month: summary.month,
      totalRuns: summary.totalRuns,
      totalDistanceKm: summary.totalDistanceKm,
      topRuns: summary.topRuns as Prisma.InputJsonValue,
    },
    update: {
      totalRuns: summary.totalRuns,
      totalDistanceKm: summary.totalDistanceKm,
      topRuns: summary.topRuns as Prisma.InputJsonValue,
    },
  });
}

export async function listRunsPage({
  cursor,
  limit,
}: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<RunsPage> {
  const pageLimit = normalizeRunPageLimit(limit);
  const where = getRunsPageWhere(cursor);

  const records = await prisma.run.findMany({
    orderBy: [{ startDate: "desc" }, { id: "asc" }],
    take: pageLimit + 1,
    where,
  });

  const pageRecords = records.slice(0, pageLimit);
  const hasMore = records.length > pageLimit;
  const lastPageRecord = pageRecords.at(-1);
  let totalRuns = 0;
  let totalDistanceKm = 0;

  try {
    totalRuns = await prisma.run.count();
    const totalDistance = await prisma.run.aggregate({ _sum: { distanceKm: true } });
    totalDistanceKm = totalDistance._sum.distanceKm ?? 0;
  } catch (error) {
    console.error("Unable to load run totals:", error);
  }

  return {
    runs: pageRecords.map(toRunActivity),
    nextCursor: hasMore && lastPageRecord ? encodeRunCursor(lastPageRecord) : null,
    totalRuns,
    totalDistanceKm,
  };
}

export async function listTimelineYearSummary(year: number): Promise<TimelineYearSummary> {
  const normalizedYear = Number.isFinite(year) ? Math.trunc(year) : new Date().getFullYear();
  try {
    const rows = await prisma.timelineData.findMany({
      where: { year: normalizedYear },
      orderBy: { month: "asc" },
      select: {
        year: true,
        month: true,
        totalRuns: true,
        totalDistanceKm: true,
        topRuns: true,
      },
    });
    const monthByNumber = new Map(rows.map((row) => [row.month, timelineMonthFromRow(row)]));
    const months = Array.from({ length: MONTHS_IN_YEAR }, (_, index) => {
      const month = index + 1;
      return monthByNumber.get(month) ?? emptyTimelineMonth(normalizedYear, month);
    });

    return {
      year: normalizedYear,
      months,
    };
  } catch (error) {
    console.error("Unable to load TimelineData rows, falling back to Run aggregation:", error);
    return buildTimelineYearSummaryFromRuns(normalizedYear);
  }
}

export async function rebuildTimelineDataForYears(years: number[]) {
  const uniqueYears = Array.from(new Set(years.map((year) => Math.trunc(year)).filter(Number.isFinite)));
  const touched = new Set<string>();

  for (const year of uniqueYears) {
    for (let month = 1; month <= MONTHS_IN_YEAR; month += 1) {
      await upsertTimelineSummaryByYearMonth(year, month);
      touched.add(`${year}-${month}`);
    }
  }

  return { monthsRebuilt: touched.size };
}

export async function rebuildTimelineDataFromRuns() {
  const runYears = await prisma.run.findMany({
    select: { startDate: true },
  });
  const years = Array.from(new Set(runYears.map((run) => run.startDate.getUTCFullYear())));

  if (years.length === 0) {
    return { monthsRebuilt: 0, yearsRebuilt: 0 };
  }

  const result = await rebuildTimelineDataForYears(years);
  return {
    ...result,
    yearsRebuilt: years.length,
  };
}

export async function rebuildTimelineDataForActivities(activities: NormalizedStravaActivity[]) {
  if (activities.length === 0) {
    return { monthsRebuilt: 0 };
  }

  const touchedMonths = new Set<string>();
  for (const activity of activities) {
    const date = new Date(activity.date);
    if (Number.isNaN(date.getTime())) continue;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    touchedMonths.add(`${year}-${month}`);
  }

  for (const value of touchedMonths) {
    const [year, month] = value.split("-").map((part) => Number.parseInt(part, 10));
    await upsertTimelineSummaryByYearMonth(year, month);
  }

  return { monthsRebuilt: touchedMonths.size };
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
