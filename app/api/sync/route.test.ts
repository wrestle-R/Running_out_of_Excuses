import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";

const getServerEnvMock = vi.hoisted(() => vi.fn());
const countRunsMock = vi.hoisted(() => vi.fn());
const upsertRunsMock = vi.hoisted(() => vi.fn());
const removeLegacyCsvDuplicatesMock = vi.hoisted(() => vi.fn());
const rebuildTimelineDataFromRunsMock = vi.hoisted(() => vi.fn());
const rebuildTimelineDataForActivitiesMock = vi.hoisted(() => vi.fn());
const getLatestStravaActivitiesMock = vi.hoisted(() => vi.fn());
const iterateStravaActivityPagesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/env", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("@/lib/server/strava", () => ({
  getLatestStravaActivities: getLatestStravaActivitiesMock,
  iterateStravaActivityPages: iterateStravaActivityPagesMock,
}));

vi.mock("@/services/runService", () => ({
  countRuns: countRunsMock,
  upsertRuns: upsertRunsMock,
  removeLegacyCsvDuplicates: removeLegacyCsvDuplicatesMock,
  rebuildTimelineDataFromRuns: rebuildTimelineDataFromRunsMock,
  rebuildTimelineDataForActivities: rebuildTimelineDataForActivitiesMock,
}));

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerEnvMock.mockReturnValue({
      STRAVA_CLIENT_ID: "id",
      STRAVA_CLIENT_SECRET: "secret",
      STRAVA_REFRESH_TOKEN: "token",
    });
    process.env.STRAVA_EXPECTED_ACTIVITY_COUNT = "101";
  });

  it("uses 25-run refresh mode and rebuilds timeline for touched months", async () => {
    countRunsMock.mockResolvedValue(101);
    const activities = [{ id: "1", date: "2026-04-01T00:00:00.000Z" }];
    getLatestStravaActivitiesMock.mockResolvedValue(activities);
    upsertRunsMock.mockResolvedValue({ total: 1, succeeded: 1, failed: 0, inserted: 1, updated: 0 });
    removeLegacyCsvDuplicatesMock.mockResolvedValue({ removed: 0 });
    rebuildTimelineDataForActivitiesMock.mockResolvedValue({ monthsRebuilt: 1 });

    const response = await POST();
    const body = await response.json();

    expect(getLatestStravaActivitiesMock).toHaveBeenCalledWith(expect.anything(), 25);
    expect(rebuildTimelineDataForActivitiesMock).toHaveBeenCalledWith(activities);
    expect(body.timelineMonthsRebuilt).toBe(1);
    expect(body.mode).toBe("refresh");
  });

  it("runs timeline rebuild after seed sync", async () => {
    countRunsMock.mockResolvedValue(0);
    iterateStravaActivityPagesMock.mockImplementation(async function* () {
      yield { page: 1, activities: [{ id: "1", date: "2026-01-10T00:00:00.000Z" }] };
      yield { page: 2, activities: [] };
    });
    upsertRunsMock.mockResolvedValue({ total: 1, succeeded: 1, failed: 0, inserted: 1, updated: 0 });
    removeLegacyCsvDuplicatesMock.mockResolvedValue({ removed: 0 });
    rebuildTimelineDataFromRunsMock.mockResolvedValue({ monthsRebuilt: 12, yearsRebuilt: 1 });

    const response = await POST();
    const body = await response.json();

    expect(rebuildTimelineDataFromRunsMock).toHaveBeenCalledTimes(1);
    expect(body.timelineMonthsRebuilt).toBe(12);
    expect(body.timelineYearsRebuilt).toBe(1);
    expect(body.mode).toBe("seed");
  });
});
