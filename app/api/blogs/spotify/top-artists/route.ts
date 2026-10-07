import { spotifyEndpoint, spotifyOptions } from "@/lib/server/spotify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const OPTIONS = spotifyOptions;

export async function GET(request: Request) {
  return spotifyEndpoint("top-artists", request);
}
