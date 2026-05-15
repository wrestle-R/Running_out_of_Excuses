import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as activitiesGet, OPTIONS as activitiesOptions } from "@/app/api/activities/route";
import { GET as runsGet, OPTIONS as runsOptions } from "@/app/api/runs/route";
import { GET as runsFeedGet, OPTIONS as runsFeedOptions } from "@/app/api/runs/feed/route";
import { GET as timelineGet, OPTIONS as timelineOptions } from "@/app/api/timeline/route";
import {
  GET as syncGet,
  OPTIONS as syncOptions,
  POST as syncPost,
} from "@/app/api/sync/route";
import { GET as testGet, OPTIONS as testOptions } from "@/app/api/test/route";
import {
  OPTIONS as newsletterSubscribeOptions,
  POST as newsletterSubscribePost,
} from "@/app/api/newsletter/subscribe/route";

const getServerEnvMock = vi.hoisted(() => vi.fn());
const getLatestStravaActivitiesMock = vi.hoisted(() => vi.fn());
const iterateStravaActivityPagesMock = vi.hoisted(() => vi.fn());
const listRunsMock = vi.hoisted(() => vi.fn());
const listRunsPageMock = vi.hoisted(() => vi.fn());
const listTimelineYearSummaryMock = vi.hoisted(() => vi.fn());
const countRunsMock = vi.hoisted(() => vi.fn());
const upsertRunsMock = vi.hoisted(() => vi.fn());
const removeLegacyCsvDuplicatesMock = vi.hoisted(() => vi.fn());
const rebuildTimelineDataFromRunsMock = vi.hoisted(() => vi.fn());
const rebuildTimelineDataForActivitiesMock = vi.hoisted(() => vi.fn());
const subscribeToNewsletterMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/env", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("@/lib/server/strava", () => ({
  getLatestStravaActivities: getLatestStravaActivitiesMock,
  iterateStravaActivityPages: iterateStravaActivityPagesMock,
}));

vi.mock("@/services/runService", () => ({
  listRuns: listRunsMock,
  listRunsPage: listRunsPageMock,
  listTimelineYearSummary: listTimelineYearSummaryMock,
  countRuns: countRunsMock,
  upsertRuns: upsertRunsMock,
  removeLegacyCsvDuplicates: removeLegacyCsvDuplicatesMock,
  rebuildTimelineDataFromRuns: rebuildTimelineDataFromRunsMock,
  rebuildTimelineDataForActivities: rebuildTimelineDataForActivitiesMock,
}));

vi.mock("@/services/newsletterService", () => ({
  isValidNewsletterEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  subscribeToNewsletter: subscribeToNewsletterMock,
}));

function expectCorsHeaders(response: Response) {
  expect(response.headers.get("access-control-allow-origin")).toBe("*");
  expect(response.headers.get("access-control-allow-methods")).toBe(
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  expect(response.headers.get("access-control-allow-headers")).toBe(
    "Content-Type, Authorization"
  );
  expect(response.headers.get("access-control-max-age")).toBe("86400");
}

describe("API endpoint regression suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    getServerEnvMock.mockReturnValue({
      STRAVA_CLIENT_ID: "id",
      STRAVA_CLIENT_SECRET: "secret",
      STRAVA_REFRESH_TOKEN: "token",
    });

    process.env.STRAVA_EXPECTED_ACTIVITY_COUNT = "101";
  });

  it("GET /api/activities returns latest activities", async () => {
    const activities = [{ id: "1", name: "Run" }];
    getLatestStravaActivitiesMock.mockResolvedValueOnce(activities);

    const response = await activitiesGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getLatestStravaActivitiesMock).toHaveBeenCalledWith(expect.anything(), 50);
    expect(body).toEqual(activities);
    expectCorsHeaders(response);
  });

  it("GET /api/activities returns sanitized rate-limit error", async () => {
    getLatestStravaActivitiesMock.mockRejectedValueOnce(new Error("rate limit exceeded"));

    const response = await activitiesGet();
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: "Unable to load activities" });
  });

  it("OPTIONS /api/activities returns CORS preflight", () => {
    const response = activitiesOptions();

    expect(response.status).toBe(204);
    expectCorsHeaders(response);
  });

  it("GET /api/runs returns all runs", async () => {
    listRunsMock.mockResolvedValueOnce([{ id: "1", name: "Morning Run" }]);

    const response = await runsGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: "1", name: "Morning Run" }]);
    expectCorsHeaders(response);
  });

  it("GET /api/runs returns sanitized error", async () => {
    listRunsMock.mockRejectedValueOnce(new Error("database timeout details"));

    const response = await runsGet();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Unable to load runs" });
  });

  it("OPTIONS /api/runs returns CORS preflight", () => {
    const response = runsOptions();

    expect(response.status).toBe(204);
    expectCorsHeaders(response);
  });

  it("GET /api/runs/feed parses limit and cursor", async () => {
    listRunsPageMock.mockResolvedValueOnce({
      runs: [{ id: "2", name: "Evening Run" }],
      nextCursor: "abc",
      totalRuns: 10,
      totalDistanceKm: 52.5,
    });

    const response = await runsFeedGet(
      new Request("http://localhost/api/runs/feed?limit=24&cursor=test_cursor")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listRunsPageMock).toHaveBeenCalledWith({
      cursor: "test_cursor",
      limit: 24,
    });
    expect(body.totalRuns).toBe(10);
    expectCorsHeaders(response);
  });

  it("GET /api/runs/feed works without query params", async () => {
    listRunsPageMock.mockResolvedValueOnce({
      runs: [],
      nextCursor: null,
      totalRuns: 0,
      totalDistanceKm: 0,
    });

    const response = await runsFeedGet(new Request("http://localhost/api/runs/feed"));

    expect(response.status).toBe(200);
    expect(listRunsPageMock).toHaveBeenCalledWith({
      cursor: null,
      limit: undefined,
    });
  });

  it("GET /api/runs/feed returns sanitized error", async () => {
    listRunsPageMock.mockRejectedValueOnce(new Error("internal sql info"));

    const response = await runsFeedGet(new Request("http://localhost/api/runs/feed?limit=24"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Unable to load runs" });
  });

  it("OPTIONS /api/runs/feed returns CORS preflight", () => {
    const response = runsFeedOptions();

    expect(response.status).toBe(204);
    expectCorsHeaders(response);
  });

  it("GET /api/timeline returns year summary", async () => {
    listTimelineYearSummaryMock.mockResolvedValueOnce({
      year: 2026,
      months: Array.from({ length: 12 }, (_, index) => ({
        year: 2026,
        month: index + 1,
        totalRuns: 0,
        totalDistanceKm: 0,
        topRuns: [],
      })),
    });

    const response = await timelineGet(new Request("http://localhost/api/timeline?year=2026"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listTimelineYearSummaryMock).toHaveBeenCalledWith(2026);
    expect(body.year).toBe(2026);
    expect(body.months).toHaveLength(12);
    expectCorsHeaders(response);
  });

  it("GET /api/timeline returns sanitized error", async () => {
    listTimelineYearSummaryMock.mockRejectedValueOnce(
      new Error('prepared statement "s1" already exists')
    );

    const response = await timelineGet(new Request("http://localhost/api/timeline?year=2026"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Unable to load timeline" });
  });

  it("OPTIONS /api/timeline returns CORS preflight", () => {
    const response = timelineOptions();

    expect(response.status).toBe(204);
    expectCorsHeaders(response);
  });

  it("POST /api/sync runs refresh mode with 25-activity fetch", async () => {
    const activities = [{ id: "1", date: "2026-04-01T00:00:00.000Z" }];
    countRunsMock.mockResolvedValueOnce(101);
    getLatestStravaActivitiesMock.mockResolvedValueOnce(activities);
    upsertRunsMock.mockResolvedValueOnce({
      total: 1,
      succeeded: 1,
      failed: 0,
      inserted: 1,
      updated: 0,
    });
    removeLegacyCsvDuplicatesMock.mockResolvedValueOnce({ removed: 0 });
    rebuildTimelineDataForActivitiesMock.mockResolvedValueOnce({ monthsRebuilt: 1 });

    const response = await syncPost();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getLatestStravaActivitiesMock).toHaveBeenCalledWith(expect.anything(), 25);
    expect(body.mode).toBe("refresh");
    expect(body.timelineMonthsRebuilt).toBe(1);
    expectCorsHeaders(response);
  });

  it("POST /api/sync runs seed mode and rebuilds full timeline data", async () => {
    countRunsMock.mockResolvedValueOnce(0);
    iterateStravaActivityPagesMock.mockImplementationOnce(async function* () {
      yield { page: 1, activities: [{ id: "1", date: "2026-01-10T00:00:00.000Z" }] };
      yield { page: 2, activities: [] };
    });
    upsertRunsMock.mockResolvedValue({
      total: 1,
      succeeded: 1,
      failed: 0,
      inserted: 1,
      updated: 0,
    });
    removeLegacyCsvDuplicatesMock.mockResolvedValueOnce({ removed: 0 });
    rebuildTimelineDataFromRunsMock.mockResolvedValueOnce({ monthsRebuilt: 12, yearsRebuilt: 1 });

    const response = await syncPost();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("seed");
    expect(body.timelineMonthsRebuilt).toBe(12);
    expect(body.timelineYearsRebuilt).toBe(1);
  });

  it("POST /api/sync returns sanitized error", async () => {
    countRunsMock.mockResolvedValueOnce(101);
    getLatestStravaActivitiesMock.mockRejectedValueOnce(new Error("unexpected db details"));

    const response = await syncPost();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Unable to sync runs" });
  });

  it("GET /api/sync is disabled", async () => {
    const response = syncGet();
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(body).toBe("Not found");
    expectCorsHeaders(response);
  });

  it("OPTIONS /api/sync returns CORS preflight", () => {
    const response = syncOptions();

    expect(response.status).toBe(204);
    expectCorsHeaders(response);
  });

  it("GET /api/test returns backend health and env flags", async () => {
    const response = testGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Backend is working!");
    expect(typeof body.timestamp).toBe("string");
    expect(body.env).toEqual({
      hasClientId: true,
      hasClientSecret: true,
      hasRefreshToken: true,
    });
    expectCorsHeaders(response);
  });

  it("OPTIONS /api/test returns CORS preflight", () => {
    const response = testOptions();

    expect(response.status).toBe(204);
    expectCorsHeaders(response);
  });

  it("POST /api/newsletter/subscribe returns success response", async () => {
    subscribeToNewsletterMock.mockResolvedValueOnce({ email: "test@example.com" });

    const response = await newsletterSubscribePost(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          subscribedAt: "2026-05-15T00:00:00.000Z",
          source: "blogs",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      message: "Successfully subscribed",
      email: "test@example.com",
    });
    expect(subscribeToNewsletterMock).toHaveBeenCalledWith({
      email: "test@example.com",
      subscribedAt: "2026-05-15T00:00:00.000Z",
      source: "blogs",
    });
    expectCorsHeaders(response);
  });

  it("POST /api/newsletter/subscribe validates email", async () => {
    const response = await newsletterSubscribePost(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      message: "Invalid email address",
    });
    expect(subscribeToNewsletterMock).not.toHaveBeenCalled();
    expectCorsHeaders(response);
  });

  it("POST /api/newsletter/subscribe returns sanitized server error", async () => {
    subscribeToNewsletterMock.mockRejectedValueOnce(new Error("database details"));

    const response = await newsletterSubscribePost(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      message: "Server error. Please try again later.",
    });
    expectCorsHeaders(response);
  });

  it("OPTIONS /api/newsletter/subscribe returns CORS preflight", () => {
    const response = newsletterSubscribeOptions();

    expect(response.status).toBe(204);
    expectCorsHeaders(response);
  });
});
