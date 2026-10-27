import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const photos = await prisma.runnyPhoto.findMany({
      where: { deletedAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true, url: true, alt: true, caption: true, placement: true, year: true, month: true, position: true },
    });
    return Response.json({ photos }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to load photos" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
