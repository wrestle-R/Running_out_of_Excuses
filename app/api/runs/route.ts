import { jsonResponse, optionsResponse } from "@/lib/server/http";
import { listRuns } from "@/services/runService";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const runs = await listRuns();
    return jsonResponse(runs);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to load runs" },
      { status: 500 }
    );
  }
}
