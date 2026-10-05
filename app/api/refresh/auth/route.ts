import {
  createRefreshSession,
  refreshPassword,
  refreshSessionCookie,
  trustedRefreshOrigin,
  validRefreshPassword,
  validRefreshSession,
} from "@/lib/server/refresh-auth";

export const dynamic = "force-dynamic";

function json(value: unknown, status = 200, cookie?: string) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}) },
  });
}

export function GET(request: Request) {
  return json({ authenticated: validRefreshSession(request) });
}

export async function POST(request: Request) {
  if (!trustedRefreshOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  if (!refreshPassword()) return json({ error: "Refresh authentication is not configured" }, 503);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON is required" }, 415);
  let password: unknown;
  try { ({ password } = await request.json()); } catch { return json({ error: "Invalid request" }, 400); }
  if (!validRefreshPassword(password)) return json({ error: "Incorrect password" }, 401);
  return json({ authenticated: true }, 200, refreshSessionCookie(request, createRefreshSession()));
}

export function DELETE(request: Request) {
  if (!trustedRefreshOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  return json({ authenticated: false }, 200, refreshSessionCookie(request, "", 0));
}
