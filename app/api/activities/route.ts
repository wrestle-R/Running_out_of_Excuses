import { getServerEnv } from "@/lib/server/env";
import { validRefreshSession } from "@/lib/server/refresh-auth";
import { getLatestStravaActivities } from "@/lib/server/strava";

export const dynamic = "force-dynamic";

function privateJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!validRefreshSession(request)) {
    return privateJson({ error: "Authentication required" }, 401);
  }
  try {
    const activities = await getLatestStravaActivities(getServerEnv(), 50);
    return privateJson(activities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Unable to load activities:", error);
    return privateJson(
      { error: "Unable to load activities" },
      message.includes("rate limit exceeded") ? 429 : 500
    );
  }
}
