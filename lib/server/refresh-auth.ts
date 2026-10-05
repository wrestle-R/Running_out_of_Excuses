import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const REFRESH_COOKIE = "run_refresh_session";
export const REFRESH_SESSION_SECONDS = 8 * 60 * 60;

export function refreshPassword() {
  return process.env.REFRESH_PAGE_PASSWORD || "";
}

export function validRefreshPassword(value: unknown) {
  const expected = refreshPassword();
  if (!expected || typeof value !== "string" || value.length > 1024) return false;
  return timingSafeEqual(
    createHash("sha256").update(value).digest(),
    createHash("sha256").update(expected).digest()
  );
}

function signature(payload: string) {
  return createHmac("sha256", refreshPassword())
    .update("run-refresh-session:" + payload)
    .digest();
}

export function createRefreshSession(now = Date.now()) {
  if (!refreshPassword()) throw new Error("Refresh authentication is not configured");
  const payload = Buffer.from(JSON.stringify({ expires: now + REFRESH_SESSION_SECONDS * 1000 })).toString("base64url");
  return payload + "." + signature(payload).toString("base64url");
}

export function validRefreshSession(request: Request, now = Date.now()) {
  if (!refreshPassword()) return false;
  const cookie = request.headers.get("cookie") || "";
  const value = cookie.split(";").map(part => part.trim()).find(part => part.startsWith(REFRESH_COOKIE + "="))?.slice(REFRESH_COOKIE.length + 1);
  if (!value || value.length > 512) return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  try {
    const expected = signature(parts[0]);
    const received = Buffer.from(parts[1], "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;
    const { expires } = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return typeof expires === "number" && expires > now && expires <= now + REFRESH_SESSION_SECONDS * 1000;
  } catch {
    return false;
  }
}

export function trustedRefreshOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return request.headers.get("sec-fetch-site") !== "cross-site" && (!origin || origin === new URL(request.url).origin);
}

export function refreshSessionCookie(request: Request, value: string, maxAge = REFRESH_SESSION_SECONDS) {
  return `${REFRESH_COOKIE}=${value}; Path=/api; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
