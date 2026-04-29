import { jsonResponse, optionsResponse } from "@/lib/server/http";
import { listRunsPage } from "@/services/runService";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    const page = await listRunsPage({ cursor, limit });
    return jsonResponse(page);
  } catch (error) {
    console.error("Unable to load runs feed:", error);
    return jsonResponse(
      { error: "Unable to load runs" },
      { status: 500 }
    );
  }
}
