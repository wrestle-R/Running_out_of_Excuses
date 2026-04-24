import { getServerEnv } from "@/lib/server/env";
import { jsonResponse, optionsResponse, textResponse } from "@/lib/server/http";
import { exchangeAuthorizationCode } from "@/lib/server/strava";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return textResponse("Missing code", { status: 400 });
  }

  try {
    const result = await exchangeAuthorizationCode(getServerEnv(), code);
    return jsonResponse(result.data, { status: result.ok ? 200 : result.status });
  } catch {
    return textResponse("Something went wrong.", { status: 500 });
  }
}
