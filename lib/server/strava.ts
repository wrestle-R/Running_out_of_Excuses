import type { RunSplit, ServerEnv } from "@/types";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ACTIVITIES_BASE_URL = "https://www.strava.com/api/v3/athlete/activities";
const DEFAULT_REFRESH_LIMIT = 50;
const DEFAULT_SEED_PAGE_SIZE = 50;

type Fetcher = typeof fetch;

type StravaActivity = {
  id: number | string;
  name?: string;
  type?: string;
  sport_type?: string;
  start_date?: string;
  distance?: number;
  elapsed_time?: number;
  splits_metric?: Array<{
    split?: number;
    distance?: number;
    elapsed_time?: number;
    average_speed?: number;
    pace_zone?: number;
  }>;
  description?: string | null;
};

export type NormalizedStravaActivity = {
  id: string;
  name: string;
  sportType: string | null;
  date: string;
  distance_km: number;
  elapsed_time_min: number;
  average_speed_kmph: number;
  pace_min_per_km: string | null;
  pace: string | null;
  splits: RunSplit[];
  description: string | null;
  raw: StravaActivity;
  createdAt: string;
  updatedAt: string;
};

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function stravaError(label: string, data: unknown) {
  const message = JSON.stringify(data);
  if (message.includes("Rate Limit Exceeded")) {
    return new Error(
      `${label}: Strava rate limit exceeded. Wait for Strava's current rate-limit window to reset, then retry. Raw response: ${message}`
    );
  }

  return new Error(`${label}: ${message}`);
}

function requireStravaEnv(env: ServerEnv) {
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET || !env.STRAVA_REFRESH_TOKEN) {
    throw new Error("Missing Strava environment variables");
  }
}

export function normalizeStravaActivity(
  activity: StravaActivity,
  timestamp = new Date().toISOString()
): NormalizedStravaActivity {
  const distanceKm = activity.distance ? activity.distance / 1000 : 0;
  const elapsedTimeMin = activity.elapsed_time ? activity.elapsed_time / 60 : 0;
  const calculatedPace =
    distanceKm > 0 && elapsedTimeMin > 0 ? (elapsedTimeMin / distanceKm).toFixed(2) : null;

  return {
    id: String(activity.id),
    name: activity.name || "Untitled Activity",
    sportType: activity.sport_type || activity.type || null,
    date: activity.start_date ? new Date(activity.start_date).toISOString() : timestamp,
    distance_km: Number(distanceKm.toFixed(2)),
    elapsed_time_min: Number(elapsedTimeMin.toFixed(1)),
    average_speed_kmph:
      activity.elapsed_time && activity.distance
        ? Number(((activity.distance / activity.elapsed_time) * 3.6).toFixed(2))
        : 0,
    pace_min_per_km: calculatedPace,
    pace: calculatedPace,
    splits: Array.isArray(activity.splits_metric)
      ? activity.splits_metric.map((split) => {
          const splitDistanceKm = split.distance ? split.distance / 1000 : 0;
          const splitTimeMin = split.elapsed_time ? split.elapsed_time / 60 : 0;

          return {
            km: split.split,
            distance: split.distance ?? null,
            average_speed: split.average_speed ?? null,
            pace_zone: split.pace_zone ?? null,
            pace_min_per_km:
              splitDistanceKm > 0 && splitTimeMin > 0
                ? (splitTimeMin / splitDistanceKm).toFixed(2)
                : null,
            elapsed_time: split.elapsed_time ?? null,
          };
        })
      : [],
    description:
      activity.description && activity.description.trim() ? activity.description.trim() : null,
    raw: activity,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function refreshAccessToken(env: ServerEnv, fetcher: Fetcher = fetch) {
  requireStravaEnv(env);

  const response = await fetcher(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: env.STRAVA_REFRESH_TOKEN,
    }),
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Strava Token Error: ${JSON.stringify(data)}`);
  }

  return data.access_token as string;
}

async function getDetailedActivity(
  summary: StravaActivity,
  accessToken: string,
  fetcher: Fetcher
) {
  try {
    const detailResponse = await fetcher(`https://www.strava.com/api/v3/activities/${summary.id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const detail = await parseJsonResponse(detailResponse);

    if (!detailResponse.ok) {
      throw stravaError("Strava Activity Detail Error", detail);
    }

    return detail as StravaActivity;
  } catch {
    return summary;
  }
}

async function getStravaActivitiesPageWithToken(
  accessToken: string,
  options: { page?: number; perPage?: number; includeDetails?: boolean } = {},
  fetcher: Fetcher = fetch,
  now = () => new Date().toISOString()
) {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? DEFAULT_REFRESH_LIMIT;
  const includeDetails = options.includeDetails ?? true;
  const url = `${STRAVA_ACTIVITIES_BASE_URL}?per_page=${perPage}&page=${page}`;
  const activitiesResponse = await fetcher(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const summaries = await parseJsonResponse(activitiesResponse);
  if (!activitiesResponse.ok) {
    throw stravaError("Strava Activities Error", summaries);
  }

  const list = Array.isArray(summaries) ? (summaries as StravaActivity[]) : [];
  const normalized: NormalizedStravaActivity[] = [];

  for (const summary of list) {
    const detail = includeDetails ? await getDetailedActivity(summary, accessToken, fetcher) : summary;
    normalized.push(normalizeStravaActivity(detail, now()));
  }

  return normalized;
}

export async function getStravaActivitiesPage(
  env: ServerEnv,
  options: { page?: number; perPage?: number; includeDetails?: boolean } = {},
  fetcher: Fetcher = fetch,
  now = () => new Date().toISOString()
) {
  const accessToken = await refreshAccessToken(env, fetcher);
  return getStravaActivitiesPageWithToken(accessToken, options, fetcher, now);
}

export async function* iterateStravaActivityPages(
  env: ServerEnv,
  options: { perPage?: number; includeDetails?: boolean } = {},
  fetcher: Fetcher = fetch,
  now = () => new Date().toISOString()
) {
  const perPage = options.perPage ?? DEFAULT_SEED_PAGE_SIZE;
  const accessToken = await refreshAccessToken(env, fetcher);
  let page = 1;

  while (true) {
    const activities = await getStravaActivitiesPageWithToken(
      accessToken,
      { page, perPage, includeDetails: options.includeDetails },
      fetcher,
      now
    );

    yield {
      page,
      activities,
    };

    if (activities.length < perPage) {
      break;
    }

    page += 1;
  }
}

export async function getLatestStravaActivities(
  env: ServerEnv,
  limit = DEFAULT_REFRESH_LIMIT,
  fetcher: Fetcher = fetch,
  now = () => new Date().toISOString()
) {
  return getStravaActivitiesPage(env, { page: 1, perPage: limit }, fetcher, now);
}

export async function getAllStravaActivities(
  env: ServerEnv,
  fetcher: Fetcher = fetch,
  now = () => new Date().toISOString(),
  perPage = DEFAULT_SEED_PAGE_SIZE
) {
  const all: NormalizedStravaActivity[] = [];
  for await (const { activities } of iterateStravaActivityPages(env, { perPage }, fetcher, now)) {
    all.push(...activities);
  }

  return all;
}

export async function getStravaActivities(
  env: ServerEnv,
  fetcher: Fetcher = fetch,
  now = () => new Date().toISOString()
) {
  return getLatestStravaActivities(env, DEFAULT_REFRESH_LIMIT, fetcher, now);
}

export async function exchangeAuthorizationCode(
  env: ServerEnv,
  code: string,
  fetcher: Fetcher = fetch
) {
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
    throw new Error("Missing Strava client environment variables");
  }

  const response = await fetcher(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await parseJsonResponse(response),
  };
}
