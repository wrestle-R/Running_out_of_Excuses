import { describe, expect, it, vi } from "vitest";
import {
  exchangeAuthorizationCode,
  getAllStravaActivities,
  getStravaActivities,
  normalizeStravaActivity,
} from "./strava";

describe("normalizeStravaActivity", () => {
  it("matches the Worker activity shape", () => {
    const now = "2026-04-22T16:00:00.000Z";

    expect(
      normalizeStravaActivity(
        {
          id: 99,
          name: "Tempo",
          start_date: "2026-04-20T01:02:03Z",
          distance: 5250,
          elapsed_time: 1800,
          splits_metric: [
            { split: 1, distance: 1000, elapsed_time: 330 },
            { split: 2, distance: 750, elapsed_time: 260 },
          ],
          description: "  felt good  ",
        },
        now
      )
    ).toMatchObject({
      id: "99",
      name: "Tempo",
      sportType: null,
      date: "2026-04-20T01:02:03.000Z",
      distance_km: 5.25,
      elapsed_time_min: 30,
      average_speed_kmph: 10.5,
      pace_min_per_km: "5.71",
      pace: "5.71",
      splits: [
        { km: 1, distance: 1000, pace_min_per_km: "5.50", elapsed_time: 330 },
        { km: 2, distance: 750, pace_min_per_km: "5.78", elapsed_time: 260 },
      ],
      description: "felt good",
      createdAt: now,
      updatedAt: now,
    });
  });
});

describe("getStravaActivities", () => {
  it("refreshes the token, fetches summaries, and fetches details", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: "access-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: 1, name: "Summary" }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 1,
          name: "Detailed",
          start_date: "2026-04-20T00:00:00Z",
          distance: 1000,
          elapsed_time: 300,
          splits_metric: [],
        }),
      });

    const activities = await getStravaActivities(
      {
        STRAVA_CLIENT_ID: "client-id",
        STRAVA_CLIENT_SECRET: "client-secret",
        STRAVA_REFRESH_TOKEN: "refresh-token",
      },
      fetcher,
      () => "2026-04-22T16:00:00.000Z"
    );

    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      id: "1",
      name: "Detailed",
      distance_km: 1,
      pace_min_per_km: "5.00",
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://www.strava.com/oauth/token",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://www.strava.com/api/v3/athlete/activities?per_page=50&page=1",
      { headers: { Authorization: "Bearer access-token" } }
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "https://www.strava.com/api/v3/activities/1",
      { headers: { Authorization: "Bearer access-token" } }
    );
  });

  it("paginates full seed imports until a short page", async () => {
    const summariesPageOne = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `Summary ${index + 1}`,
      start_date: "2026-04-20T00:00:00Z",
    }));
    const summariesPageTwo = Array.from({ length: 50 }, (_, index) => ({
      id: index + 51,
      name: `Summary ${index + 51}`,
      start_date: "2026-04-21T00:00:00Z",
    }));
    const summariesPageThree = [
      { id: 101, name: "Summary 101", start_date: "2026-04-22T00:00:00Z" },
    ];
    const fetcher = vi.fn();

    fetcher
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: "access-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(summariesPageOne),
      });

    summariesPageOne.forEach((summary) => {
      fetcher.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...summary,
          distance: 1000,
          elapsed_time: 300,
          splits_metric: [],
        }),
      });
    });

    fetcher
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(summariesPageTwo),
      });

    summariesPageTwo.forEach((summary) => {
      fetcher.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...summary,
          distance: 1000,
          elapsed_time: 300,
          splits_metric: [],
        }),
      });
    });

    fetcher
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(summariesPageThree),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...summariesPageThree[0],
          distance: 1000,
          elapsed_time: 300,
          splits_metric: [],
        }),
      });

    const activities = await getAllStravaActivities(
      {
        STRAVA_CLIENT_ID: "client-id",
        STRAVA_CLIENT_SECRET: "client-secret",
        STRAVA_REFRESH_TOKEN: "refresh-token",
      },
      fetcher,
      () => "2026-04-22T16:00:00.000Z"
    );

    expect(activities).toHaveLength(101);
    expect(fetcher).toHaveBeenCalledWith(
      "https://www.strava.com/api/v3/athlete/activities?per_page=50&page=1",
      expect.any(Object)
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://www.strava.com/api/v3/athlete/activities?per_page=50&page=2",
      expect.any(Object)
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://www.strava.com/api/v3/athlete/activities?per_page=50&page=3",
      expect.any(Object)
    );
  });
});

describe("exchangeAuthorizationCode", () => {
  it("posts the code exchange request to Strava", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ refresh_token: "new-refresh" }),
    });

    const result = await exchangeAuthorizationCode(
      {
        STRAVA_CLIENT_ID: "client-id",
        STRAVA_CLIENT_SECRET: "client-secret",
      },
      "abc123",
      fetcher
    );

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { refresh_token: "new-refresh" },
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      code: "abc123",
      grant_type: "authorization_code",
    });
  });
});
