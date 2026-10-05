import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";
import { POST as sync } from "@/app/api/sync/route";
import { createRefreshSession, REFRESH_COOKIE, REFRESH_SESSION_SECONDS } from "@/lib/server/refresh-auth";

function login(password: unknown, origin = "https://example.com") {
  return new Request("https://example.com/api/refresh/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify({ password }),
  });
}

function withCookie(value: string, origin = "https://example.com") {
  return new Request("https://example.com/api/sync", {
    method: "POST",
    headers: { cookie: REFRESH_COOKIE + "=" + value, origin },
  });
}

describe("Refresh authentication", () => {
  beforeEach(() => vi.stubEnv("REFRESH_PAGE_PASSWORD", "test-refresh-password"));
  afterEach(() => vi.unstubAllEnvs());

  it("rejects anonymous sync before reading Strava or the database", async () => {
    const response = await sync(new Request("https://example.com/api/sync", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("creates a private HTTPS cookie only for the correct password", async () => {
    expect((await POST(login("wrong"))).status).toBe(401);
    expect((await POST(login({ password: "test-refresh-password" }))).status).toBe(401);
    const response = await POST(login("test-refresh-password"));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).not.toContain("test-refresh-password");
    const request = new Request("https://example.com/api/refresh/auth", { headers: { cookie } });
    expect(await GET(request).json()).toEqual({ authenticated: true });
  });

  it("rejects tampered, expired, and malformed session cookies", async () => {
    const token = createRefreshSession();
    for (const value of [token.slice(0, -2) + "AA", createRefreshSession(Date.now() - (REFRESH_SESSION_SECONDS + 1) * 1000), "invalid", "payload.invalid.signature"]) {
      expect((await sync(withCookie(value))).status).toBe(401);
    }
  });

  it("rejects cross-origin login and sync even with a signed session", async () => {
    expect((await POST(login("test-refresh-password", "https://attacker.example"))).status).toBe(403);
    expect((await sync(withCookie(createRefreshSession(), "https://attacker.example"))).status).toBe(403);
  });

  it("fails closed when server authentication is missing", async () => {
    vi.stubEnv("REFRESH_PAGE_PASSWORD", "");
    expect((await POST(login("test-refresh-password"))).status).toBe(503);
    expect((await sync(withCookie("anything"))).status).toBe(401);
  });

  it("handles invalid request bodies and allows logout", async () => {
    const invalid = new Request("https://example.com/api/refresh/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    expect((await POST(invalid)).status).toBe(400);
    const response = DELETE(new Request("https://example.com/api/refresh/auth", { method: "DELETE" }));
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
