import { jsonResponse, optionsResponse } from "@/lib/server/http";
import { listGuitarSongs } from "@/services/blogs/guitar/songService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const OPTIONS = optionsResponse;

export async function GET() {
  try {
    return jsonResponse(await listGuitarSongs(), { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return jsonResponse({ error: "Could not load the song list" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
