import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getLegacyCsvDuplicateIds } from "./runService";

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
