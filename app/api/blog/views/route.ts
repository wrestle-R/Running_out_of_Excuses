import { jsonResponse, optionsResponse } from "@/lib/server/http";
import { listBlogViews } from "@/services/blogViewsService";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

function parseSlugs(url: URL) {
  const rawSlugs = url.searchParams.get("slugs") || "";
  return rawSlugs
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slugs = parseSlugs(url);
    const views = await listBlogViews(slugs);

    return jsonResponse({
      success: true,
      views,
    });
  } catch (error) {
    console.error("Blog views fetch error:", error);
    return jsonResponse(
      { success: false, message: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
