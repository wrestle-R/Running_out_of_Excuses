import { jsonResponse, optionsResponse } from "@/lib/server/http";
import { listTimelineYearSummary } from "@/services/runService";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number.parseInt(yearParam, 10) : new Date().getFullYear();

  try {
    const summary = await listTimelineYearSummary(year);
    return jsonResponse(summary);
  } catch (error) {
    console.error("Unable to load timeline:", error);
    return jsonResponse(
      { error: "Unable to load timeline" },
      { status: 500 }
    );
  }
}
