import { getServerEnv } from "@/lib/server/env";
import { jsonResponse, optionsResponse } from "@/lib/server/http";
import { getLatestStravaActivities } from "@/lib/server/strava";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const activities = await getLatestStravaActivities(getServerEnv(), 50);
    return jsonResponse(activities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(
      { error: message },
      { status: message.includes("rate limit exceeded") ? 429 : 500 }
    );
  }
}
