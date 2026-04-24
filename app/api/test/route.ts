import { getServerEnv } from "@/lib/server/env";
import { jsonResponse, optionsResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export function GET() {
  const env = getServerEnv();

  return jsonResponse({
    message: "Backend is working!",
    timestamp: new Date().toISOString(),
    env: {
      hasClientId: !!env.STRAVA_CLIENT_ID,
      hasClientSecret: !!env.STRAVA_CLIENT_SECRET,
      hasRefreshToken: !!env.STRAVA_REFRESH_TOKEN,
    },
  });
}
