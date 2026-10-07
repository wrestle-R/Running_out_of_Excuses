import { spotifyEndpoint, spotifyOptions } from "@/lib/server/spotify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const OPTIONS = spotifyOptions;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return spotifyEndpoint("preview", request, (await params).id);
}
