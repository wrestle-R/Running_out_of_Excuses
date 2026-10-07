import { describe, expect, it } from "vitest";
// The script exports its parsers without starting a server when imported.
import { loopbackRedirect, readEnv, updateEnv, validState } from "./spotify-authorize.mjs";

describe("local Spotify authorization", () => {
  it("updates Spotify credentials without changing other environment variables", () => {
    const original = '# Database\nDATABASE_URL="postgres://unchanged"\nSPOTIFY_REFRESH_TOKEN="old"\n';
    const updated = updateEnv(original, { SPOTIFY_REFRESH_TOKEN: "fresh", SPOTIFY_CLIENT_ID: "client" });
    expect(updated).toContain('DATABASE_URL="postgres://unchanged"');
    expect(readEnv(updated)).toMatchObject({ SPOTIFY_REFRESH_TOKEN: "fresh", SPOTIFY_CLIENT_ID: "client" });
    expect(updated.match(/SPOTIFY_REFRESH_TOKEN=/g)).toHaveLength(1);
  });

  it("only accepts the matching OAuth state", () => {
    expect(validState("valid-state", "valid-state")).toBe(true);
    expect(validState("valid-state", "wrong-state")).toBe(false);
    expect(validState("valid-state", null)).toBe(false);
  });

  it("keeps the callback on IPv4 loopback and rejects localhost or remote hosts", () => {
    expect(loopbackRedirect("http://127.0.0.1:1234/callback").port).toBe("1234");
    expect(() => loopbackRedirect("http://localhost:1234/callback")).toThrow();
    expect(() => loopbackRedirect("https://untrusted.example/callback")).toThrow();
    expect(() => loopbackRedirect("http://127.0.0.1:1234/callback?code=anything")).toThrow();
  });
});
