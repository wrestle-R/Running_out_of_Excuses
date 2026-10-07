import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const TRACK = "4iV5W9uYEdYUVa79Axb7Rh";
const PLAYLIST = "5iw7Tk89Q0p9a5waGqJFLG";
const track = { id: TRACK, type: "track", name: "A song", artists: [{ id: "artist", name: "An artist" }],
  album: { name: "An album", images: [] }, duration_ms: 180000, external_urls: { spotify: `https://open.spotify.com/track/${TRACK}` } };
const fetchMock = vi.fn();
let endpoint: typeof import("./spotify").spotifyEndpoint;
const json = (data: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(data), { status, headers });
const token = () => json({ access_token: "test-access-token", expires_in: 3600 });

function request(name: string, method = "GET", body?: unknown, origin = "https://blogs.russel.is-a.dev") {
  return new Request(`https://runny.russel.is-a.dev/api/blogs/spotify/${name}`, {
    method, headers: { Origin: origin, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("SPOTIFY_CLIENT_ID", "test-client");
  vi.stubEnv("SPOTIFY_CLIENT_SECRET", "test-secret");
  vi.stubEnv("SPOTIFY_REFRESH_TOKEN", "test-refresh");
  vi.stubEnv("SPOTIFY_PLAYLIST_ID", PLAYLIST);
  ({ spotifyEndpoint: endpoint } = await import("./spotify"));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Spotify migration", () => {
  it("reports missing user authorization without treating it as no playback", async () => {
    vi.stubEnv("SPOTIFY_REFRESH_TOKEN", "");
    const response = await endpoint("now-playing", request("now-playing"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "SPOTIFY_AUTH_REQUIRED" });
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sanitizes revoked refresh-token errors and allows reconnection", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "invalid_grant", error_description: "private token details" }, 400));
    const failed = await endpoint("now-playing", request("now-playing"));
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("private token details");
    vi.stubEnv("SPOTIFY_REFRESH_TOKEN", "fresh-refresh");
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const recovered = await endpoint("now-playing", request("now-playing"));
    expect(await recovered.json()).toMatchObject({ isPlaying: false });
  });

  it("shares search/token requests and preserves the frontend response contract", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ tracks: { items: [track] } }));
    const results = await Promise.all([1, 2].map(() => endpoint("search", request("search?q=hello&limit=99"))));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("limit=10");
    expect(await results[0].json()).toMatchObject({ count: 1, suggestions: [{ id: TRACK, previewUrl: null, popularity: null }] });
    expect(await results[1].json()).toMatchObject({ count: 1 });
  });

  it("retries an expired access token once", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ error: {} }, 401))
      .mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ tracks: { items: [track] } }));
    const response = await endpoint("search", request("search?q=hello"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps Spotify rate limits and Retry-After visible to callers", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ error: {} }, 429, { "Retry-After": "42" }));
    const response = await endpoint("top-tracks", request("top-tracks"));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
  });

  it("handles no playback and podcast playback without crashing", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await (await endpoint("now-playing", request("now-playing"))).json()).toMatchObject({ isPlaying: false });
    vi.stubEnv("SPOTIFY_REFRESH_TOKEN", "another-refresh");
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ item: { type: "episode", name: "Podcast" }, is_playing: true }));
    expect(await (await endpoint("now-playing", request("now-playing"))).json()).toMatchObject({ isPlaying: false });
  });

  it("normalizes current and legacy playlist fields, skipping missing items", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({
      items: [{ item: track }, { track }, { item: null }, { item: { type: "episode" } }],
      total: 52, limit: 50, offset: 0,
      next: `https://api.spotify.com/v1/playlists/${PLAYLIST}/items?offset=50&limit=50`,
    }));
    const response = await endpoint("playlist-tracks", request("playlist-tracks"));
    const data = await response.json();
    expect(data.tracks).toHaveLength(2);
    expect(data.next).toBe("/api/blogs/spotify/playlist-tracks?offset=50&limit=50");
    expect(fetchMock.mock.calls[1][0]).toContain(`/playlists/${PLAYLIST}/items`);
  });

  it("reads renamed playlist totals and tolerates absent playlist contents", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ items: [
      { id: "first", items: { total: 22 } }, { id: "legacy", tracks: { total: 3 } }, { id: "metadata-only" },
    ] }));
    const response = await endpoint("playlists", request("playlists"));
    expect((await response.json()).playlists.map(item => item.trackCount)).toEqual([22, 3, 0]);
  });

  it("refreshes a stale playlist after an edit handled by another server instance", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ items: [], total: 0 }))
      .mockResolvedValueOnce(json({ items: [{ item: track }], total: 1 }));
    expect((await (await endpoint("playlist-tracks", request("playlist-tracks"))).json()).total).toBe(0);
    expect((await (await endpoint("playlist-tracks", request("playlist-tracks"))).json()).total).toBe(0);
    const fresh = await endpoint("playlist-tracks", request("playlist-tracks?force=1"));
    expect((await fresh.json()).tracks).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("checks every playlist page for duplicates before adding a track", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ items: [], next: "next-page" }))
      .mockResolvedValueOnce(json({ items: [{ item: track }], next: null }));
    const response = await endpoint("addTrack", request("addTrack", "POST", { track_id: TRACK }));
    expect(response.status).toBe(409);
    expect(fetchMock.mock.calls[2][0]).toContain("offset=50");
    expect(fetchMock.mock.calls.every(([, init]) => init.method !== "POST" || String(init.body).includes("grant_type"))).toBe(true);
  });

  it("issues a deletion proof after adding, rejects tampering, and removes with current Spotify fields", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(json({ items: [], next: null }))
      .mockResolvedValueOnce(json({ snapshot_id: "added" }, 201));
    const added = await (await endpoint("addTrack", request("addTrack", "POST", { track_id: TRACK }))).json();
    expect(added.deleteToken).toBeTypeOf("string");
    const tampered = await endpoint("removeTrack", request("removeTrack", "DELETE", { track_id: TRACK, delete_token: added.deleteToken + "x" }));
    expect(tampered.status).toBe(403);
    fetchMock.mockResolvedValueOnce(json({ snapshot_id: "removed" }));
    const removed = await endpoint("removeTrack", request("removeTrack", "DELETE", { track_id: TRACK, delete_token: added.deleteToken }));
    expect(removed.status).toBe(200);
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe(`https://api.spotify.com/v1/playlists/${PLAYLIST}/items`);
    expect(JSON.parse(init.body)).toEqual({ items: [{ uri: `spotify:track:${TRACK}` }] });
  });

  it("rejects unsupported origins, missing removal proof, and malformed IDs before contacting Spotify", async () => {
    expect((await endpoint("addTrack", request("addTrack", "POST", { track_id: TRACK }, "https://untrusted.example"))).status).toBe(403);
    expect((await endpoint("removeTrack", request("removeTrack", "DELETE", { track_id: TRACK }))).status).toBe(403);
    expect((await endpoint("getTrack", request("getTrack?id=invalid/path"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects other playlists and oversized bodies before contacting Spotify", async () => {
    const otherPlaylist = await endpoint("playlist-tracks", request(`playlist-tracks?id=${TRACK}`));
    expect(otherPlaylist.status).toBe(403);
    const oversized = await endpoint("addTrack", request("addTrack", "POST", { track_id: TRACK, extra: "x".repeat(2048) }));
    expect(oversized.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
