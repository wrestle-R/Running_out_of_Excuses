import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLegacyCsvDuplicateIds, listRunsPage, listTimelineYearSummary } from "./runService";

const prismaMock = vi.hoisted(() => ({
  run: {
    aggregate: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  timelineData: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

function run(overrides: {
  id: string;
  stravaId: bigint;
  raw?: Prisma.JsonObject | null;
  createdAt?: string;
}) {
  return {
    id: overrides.id,
    stravaId: overrides.stravaId,
    sportType: "Run",
    startDate: new Date("2026-03-14T00:00:00.000Z"),
    distanceKm: 5.04,
    elapsedTimeMin: 31.4,
    raw: overrides.raw ?? null,
    createdAt: new Date(overrides.createdAt ?? "2026-04-24T00:00:00.000Z"),
  };
}

describe("getLegacyCsvDuplicateIds", () => {
  it("removes synthetic CSV rows when a canonical Strava row has the same run metrics", () => {
    expect(
      getLegacyCsvDuplicateIds([
        run({
          id: "csv-duplicate",
          stravaId: BigInt("8000000000000101"),
          raw: { source: "csv" },
        }),
        run({
          id: "strava-run",
          stravaId: BigInt("17714233368"),
          raw: { id: 17714233368 },
        }),
      ])
    ).toEqual(["csv-duplicate"]);
  });

  it("keeps one row when repeated CSV imports created the same synthetic run", () => {
    expect(
      getLegacyCsvDuplicateIds([
        run({
          id: "first-csv",
          stravaId: BigInt("8000000000000101"),
          raw: { source: "csv" },
          createdAt: "2026-04-24T00:00:00.000Z",
        }),
        run({
          id: "second-csv",
          stravaId: BigInt("8000000000000102"),
          raw: { source: "csv" },
          createdAt: "2026-04-24T00:01:00.000Z",
        }),
      ])
    ).toEqual(["second-csv"]);
  });

  it("does not delete unique CSV history that has no matching run", () => {
    expect(
      getLegacyCsvDuplicateIds([
        run({
          id: "csv-only",
          stravaId: BigInt("8000000000000101"),
          raw: { source: "csv" },
        }),
      ])
    ).toEqual([]);
  });
});

function dbRun(overrides: {
  id: string;
  stravaId: bigint;
  startDate: string;
  distanceKm?: number;
}) {
  const createdAt = new Date("2026-04-24T00:00:00.000Z");

  return {
    id: overrides.id,
    stravaId: overrides.stravaId,
    name: "Morning Run",
    sportType: "Run",
    startDate: new Date(overrides.startDate),
    distanceKm: overrides.distanceKm ?? 5,
    elapsedTimeMin: 30,
    averageSpeedKmph: 10,
    paceMinPerKm: 6,
    pace: "6.00",
    description: null,
    splits: [],
    createdAt,
    updatedAt: createdAt,
  };
}

describe("listRunsPage", () => {
  beforeEach(() => {
    prismaMock.run.aggregate.mockReset();
    prismaMock.run.count.mockReset();
    prismaMock.run.findMany.mockReset();
    prismaMock.timelineData.findMany.mockReset();
  });

  it("returns one page of runs with aggregate totals and a cursor for the next page", async () => {
    prismaMock.run.count.mockResolvedValue(3);
    prismaMock.run.aggregate.mockResolvedValue({ _sum: { distanceKm: 15 } });
    prismaMock.run.findMany.mockResolvedValue([
      dbRun({
        id: "run-a",
        stravaId: BigInt("101"),
        startDate: "2026-04-06T12:23:27.000Z",
      }),
      dbRun({
        id: "run-b",
        stravaId: BigInt("102"),
        startDate: "2026-04-01T00:49:03.000Z",
      }),
      dbRun({
        id: "run-c",
        stravaId: BigInt("103"),
        startDate: "2026-03-27T12:29:07.000Z",
      }),
    ]);

    const page = await listRunsPage({ limit: 2 });

    expect(prismaMock.run.findMany).toHaveBeenCalledWith({
      orderBy: [{ startDate: "desc" }, { id: "asc" }],
      take: 3,
      where: undefined,
    });
    expect(prismaMock.run.count).toHaveBeenCalledTimes(1);
    expect(prismaMock.run.aggregate).toHaveBeenCalledTimes(1);
    expect(page.runs.map((run) => run.id)).toEqual(["101", "102"]);
    expect(page.totalRuns).toBe(3);
    expect(page.totalDistanceKm).toBe(15);
    expect(page.nextCursor).toBeTypeOf("string");
  });

  it("uses the cursor to request runs after the last item from the previous page", async () => {
    prismaMock.run.count.mockResolvedValue(1);
    prismaMock.run.aggregate.mockResolvedValue({ _sum: { distanceKm: 5 } });
    prismaMock.run.findMany
      .mockResolvedValueOnce([
        dbRun({
          id: "run-a",
          stravaId: BigInt("101"),
          startDate: "2026-04-06T12:23:27.000Z",
        }),
        dbRun({
          id: "run-b",
          stravaId: BigInt("102"),
          startDate: "2026-04-01T00:49:03.000Z",
        }),
      ])
      .mockResolvedValueOnce([
        dbRun({
          id: "run-c",
          stravaId: BigInt("103"),
          startDate: "2026-03-27T12:29:07.000Z",
        }),
      ]);

    const firstPage = await listRunsPage({ limit: 1 });
    await listRunsPage({ limit: 1, cursor: firstPage.nextCursor });

    expect(prismaMock.run.findMany).toHaveBeenLastCalledWith({
      orderBy: [{ startDate: "desc" }, { id: "asc" }],
      take: 2,
      where: {
        OR: [
          { startDate: { lt: new Date("2026-04-06T12:23:27.000Z") } },
          {
            id: { gt: "run-a" },
            startDate: new Date("2026-04-06T12:23:27.000Z"),
          },
        ],
      },
    });
  });

  it("still returns runs page when totals query fails", async () => {
    prismaMock.run.findMany.mockResolvedValue([
      dbRun({
        id: "run-a",
        stravaId: BigInt("101"),
        startDate: "2026-04-06T12:23:27.000Z",
      }),
    ]);
    prismaMock.run.count.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const page = await listRunsPage({ limit: 1 });

    expect(page.runs).toHaveLength(1);
    expect(page.totalRuns).toBe(0);
    expect(page.totalDistanceKm).toBe(0);
  });
});

describe("listTimelineYearSummary", () => {
  beforeEach(() => {
    prismaMock.run.aggregate.mockReset();
    prismaMock.run.count.mockReset();
    prismaMock.run.findMany.mockReset();
    prismaMock.timelineData.findMany.mockReset();
  });

  it("loads timeline summaries from TimelineData and fills missing months", async () => {
    prismaMock.timelineData.findMany.mockResolvedValue([
      {
        year: 2026,
        month: 3,
        totalRuns: 1,
        totalDistanceKm: 10,
        topRuns: [
          {
            id: "203",
            name: "March Run",
            distance_km: 10,
            date: "2026-03-27T12:29:07.000Z",
          },
        ],
      },
      {
        year: 2026,
        month: 4,
        totalRuns: 2,
        totalDistanceKm: 12,
        topRuns: [
          {
            id: "201",
            name: "April Long",
            distance_km: 7,
            date: "2026-04-06T12:23:27.000Z",
          },
          {
            id: "202",
            name: "April Short",
            distance_km: 5,
            date: "2026-04-01T00:49:03.000Z",
          },
        ],
      },
    ]);

    const summary = await listTimelineYearSummary(2026);

    expect(prismaMock.timelineData.findMany).toHaveBeenCalledWith({
      where: { year: 2026 },
      orderBy: { month: "asc" },
      select: {
        year: true,
        month: true,
        totalRuns: true,
        totalDistanceKm: true,
        topRuns: true,
      },
    });
    expect(summary.year).toBe(2026);
    expect(summary.months).toHaveLength(12);
    expect(summary.months[0]).toMatchObject({
      month: 1,
      totalRuns: 0,
      totalDistanceKm: 0,
      topRuns: [],
    });
    expect(summary.months[3]).toMatchObject({
      year: 2026,
      month: 4,
      totalRuns: 2,
      totalDistanceKm: 12,
      topRuns: [
        {
          id: "201",
          distance_km: 7,
        },
        {
          id: "202",
          distance_km: 5,
        },
      ],
    });
    expect(summary.months[2]).toMatchObject({
      month: 3,
      totalRuns: 1,
      totalDistanceKm: 10,
    });
  });

  it("falls back to Run aggregation when TimelineData query fails", async () => {
    prismaMock.timelineData.findMany.mockRejectedValueOnce(new Error("TimelineData missing"));
    prismaMock.run.findMany.mockResolvedValue([
      dbRun({
        id: "april-long",
        stravaId: BigInt("201"),
        startDate: "2026-04-06T12:23:27.000Z",
        distanceKm: 7,
      }),
      dbRun({
        id: "april-short",
        stravaId: BigInt("202"),
        startDate: "2026-04-01T00:49:03.000Z",
        distanceKm: 5,
      }),
      dbRun({
        id: "march-run",
        stravaId: BigInt("203"),
        startDate: "2026-03-27T12:29:07.000Z",
        distanceKm: 10,
      }),
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const summary = await listTimelineYearSummary(2026);

    expect(prismaMock.run.findMany).toHaveBeenCalledOnce();
    expect(summary.months[3]).toMatchObject({
      month: 4,
      totalRuns: 2,
      totalDistanceKm: 12,
    });
    expect(summary.months[2]).toMatchObject({
      month: 3,
      totalRuns: 1,
      totalDistanceKm: 10,
    });
  });
});
