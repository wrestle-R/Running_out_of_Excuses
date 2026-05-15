import { jsonResponse, optionsResponse } from "@/lib/server/http";
import { incrementBlogView } from "@/services/blogViewsService";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

type TrackBody = {
  slug?: unknown;
  title?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrackBody;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!slug) {
      return jsonResponse(
        { success: false, message: "Slug is required" },
        { status: 400 }
      );
    }

    if (!title) {
      return jsonResponse(
        { success: false, message: "Title is required" },
        { status: 400 }
      );
    }

    const result = await incrementBlogView({ slug, title });

    return jsonResponse({
      success: true,
      slug: result.slug,
      views: result.views,
    });
  } catch (error) {
    console.error("Blog view track error:", error);
    return jsonResponse(
      { success: false, message: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
