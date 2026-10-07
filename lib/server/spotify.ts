import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { jsonResponse, optionsResponse } from "@/lib/server/http";

const API = "https://api.spotify.com/v1";
const TRACK_ID = /^[A-Za-z0-9]{22}$/;
const DEFAULT_PLAYLIST = "5iw7Tk89Q0p9a5waGqJFLG";
type TokenKind = "client" | "user";
type Token = { key: string; value: string; expires: number };
type CacheEntry = { expires: number; value: Promise<any> };
type Track = {
  id: string;
  type?: string;
  name?: string;
  artists?: { id?: string; name?: string }[];
  album?: { id?: string; name?: string; images?: { url: string }[]; release_date?: string };
  external_urls?: { spotify?: string };
  external_ids?: { isrc?: string };
  duration_ms?: number;
  uri?: string;
  preview_url?: string | null;
  popularity?: number;
  explicit?: boolean;
  available_markets?: string[];
};

const tokens = new Map<TokenKind, Token>();
const tokenRequests = new Map<string, Promise<string>>();
const dataCache = new Map<string, CacheEntry>();
const writes = new Map<string, { count: number; expires: number }>();
const playlistWrites = new Map<string, Promise<void>>();

export class SpotifyError extends Error {
  constructor(public code: string, message: string, public status = 502, public retryAfter?: string) {
    super(message);
  }
}

function config() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN?.trim();
  const playlistId = process.env.SPOTIFY_PLAYLIST_ID?.trim() || DEFAULT_PLAYLIST;
  if (!clientId || !clientSecret) {
    throw new SpotifyError("SPOTIFY_NOT_CONFIGURED", "Spotify music is temporarily unavailable.", 503);
  }
  const key = createHash("sha256").update([clientId, clientSecret, refreshToken || ""].join(":")).digest("hex");
  return { clientId, clientSecret, refreshToken, playlistId, key };
}

function authRequired() {
  return new SpotifyError("SPOTIFY_AUTH_REQUIRED", "Spotify needs to be connected again by the site owner.", 503);
}

async function accessToken(kind: TokenKind) {
  const env = config();
  if (kind === "user" && !env.refreshToken) throw authRequired();
  const cached = tokens.get(kind);
  if (cached?.key === env.key && cached.expires > Date.now() + 60_000) return cached.value;
  const requestKey = `${env.key}:${kind}`;
  const pending = tokenRequests.get(requestKey);
  if (pending) return pending;
  const request = (async () => {
    const body = new URLSearchParams(kind === "user"
      ? { grant_type: "refresh_token", refresh_token: env.refreshToken! }
      : { grant_type: "client_credentials" });
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json();
    if (response.status === 429) throw rateLimited(response);
    if (!response.ok || !data.access_token) {
      if (kind === "user" && data.error === "invalid_grant") throw authRequired();
      throw new SpotifyError("SPOTIFY_TOKEN_FAILED", "Spotify music is temporarily unavailable.", 503);
    }
    tokens.set(kind, { key: env.key, value: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 });
    return data.access_token as string;
  })();
  tokenRequests.set(requestKey, request);
  try { return await request; } finally { tokenRequests.delete(requestKey); }
}

function rateLimited(response: Response) {
  const retry = response.headers.get("retry-after");
  return new SpotifyError("SPOTIFY_RATE_LIMITED", "Spotify is busy. Please try again shortly.", 429,
    retry && /^\d+$/.test(retry) ? retry : "30");
}

async function spotifyRequest(path: string, kind: TokenKind, init: RequestInit = {}, retry = true): Promise<any> {
  const token = await accessToken(kind);
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 && retry) {
    tokens.delete(kind);
    return spotifyRequest(path, kind, init, false);
  }
  if (response.status === 204) return null;
  if (response.status === 429) throw rateLimited(response);
  if (!response.ok) {
    if (response.status === 401 && kind === "user") throw authRequired();
    if (response.status === 403) throw new SpotifyError("SPOTIFY_ACCESS_DENIED", "Spotify has not granted access to this music feature.", 403);
    if (response.status === 404) throw new SpotifyError("SPOTIFY_NOT_FOUND", "This Spotify item is unavailable.", 404);
    throw new SpotifyError("SPOTIFY_UPSTREAM_ERROR", "Spotify music is temporarily unavailable.");
  }
  return response.json();
}

async function read(path: string, kind: TokenKind, ttl = 15_000, force = false) {
  const cacheKey = `${config().key}:${kind}:${path}`;
  const cached = dataCache.get(cacheKey);
  if (!force && cached && cached.expires > Date.now()) return cached.value;
  const entry = { expires: Date.now() + ttl, value: spotifyRequest(path, kind) };
  dataCache.set(cacheKey, entry);
  if (dataCache.size > 300) dataCache.delete(dataCache.keys().next().value!);
  try { return await entry.value; } catch (error) {
    if (dataCache.get(cacheKey) === entry) dataCache.delete(cacheKey);
    throw error;
  }
}

function limit(url: URL, fallback = 10, max = 50) {
  const value = Number(url.searchParams.get("limit") || fallback);
  return Number.isFinite(value) ? Math.max(1, Math.min(Math.floor(value), max)) : fallback;
}

function validId(value: unknown) {
  if (typeof value !== "string" || !TRACK_ID.test(value)) {
    throw new SpotifyError("INVALID_SPOTIFY_ID", "A valid Spotify track or playlist ID is required.", 400);
  }
  return value;
}

function isTrack(track: Track | null | undefined): track is Track {
  return !!track?.id && (!track.type || track.type === "track") && Array.isArray(track.artists) && !!track.album;
}

function trackInfo(track: Track) {
  return {
    id: track.id, name: track.name || "Unknown track",
    artist: track.artists?.map(artist => artist.name).filter(Boolean).join(", ") || "Unknown artist",
    artistIds: track.artists?.map(artist => artist.id).filter(Boolean) || [],
    album: track.album?.name || "", albumId: track.album?.id || null,
    albumArt: track.album?.images?.[0]?.url || null,
    duration: track.duration_ms || 0,
    url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
    uri: track.uri || `spotify:track:${track.id}`,
    previewUrl: track.preview_url || null,
    popularity: Number.isFinite(track.popularity) ? track.popularity : null,
    explicit: !!track.explicit,
  };
}

function songInfo(track: Track) {
  const data = trackInfo(track);
  return { ...data, songUrl: data.url };
}

function playlistPath(id: string, url?: URL) {
  const offset = Math.max(0, Math.min(100_000, Math.floor(Number(url?.searchParams.get("offset")) || 0)));
  return `/playlists/${id}/items?limit=${url ? limit(url, 50) : 50}&offset=${offset}`;
}

async function playlistPage(id: string, url?: URL, force = false) {
  // Playlist contents require the owner's OAuth token in current Spotify Dev Mode.
  return read(playlistPath(id, url), "user", 15_000, force);
}

function deletionToken(trackId: string) {
  const env = config();
  const payload = Buffer.from(JSON.stringify({ trackId, playlistId: env.playlistId, issued: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", env.clientSecret).update(`spotify-delete:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

function validDeletionToken(value: unknown, trackId: string) {
  if (typeof value !== "string" || value.length > 512) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return false;
  try {
    const env = config();
    const expected = createHmac("sha256", env.clientSecret).update(`spotify-delete:${payload}`).digest();
    const received = Buffer.from(signature, "base64url");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.trackId === trackId && data.playlistId === env.playlistId && typeof data.issued === "number"
      && data.issued <= Date.now() && data.issued > Date.now() - 365 * 24 * 60 * 60_000;
  } catch { return false; }
}

function checkWriteRequest(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([
    "https://blogs.russel.is-a.dev", "https://blogs.russeldanielpaul.is-a.dev",
    new URL(request.url).origin,
    ...(process.env.SPOTIFY_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean),
  ]);
  const local = origin && process.env.NODE_ENV !== "production"
    && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!origin || (!allowed.has(origin) && !local)) {
    throw new SpotifyError("INVALID_ORIGIN", "This request origin is not allowed.", 403);
  }
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  let bucket = writes.get(key);
  if (!bucket || bucket.expires <= now) { bucket = { count: 0, expires: now + 60_000 }; writes.set(key, bucket); }
  if (++bucket.count > 10) throw new SpotifyError("TOO_MANY_REQUESTS", "Please wait before changing the playlist again.", 429, "60");
  if (writes.size > 1000) writes.delete(writes.keys().next().value!);
}

async function writeBody(request: Request) {
  checkWriteRequest(request);
  if (Number(request.headers.get("content-length")) > 2048) throw new SpotifyError("INVALID_BODY", "Request is too large.", 413);
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader) {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 2048) { await reader.cancel(); throw new SpotifyError("INVALID_BODY", "Request is too large.", 413); }
      chunks.push(chunk.value);
    }
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new SpotifyError("INVALID_BODY", "A valid JSON request is required.", 400); }
}

async function withPlaylistLock<T>(id: string, action: () => Promise<T>): Promise<T> {
  const previous = playlistWrites.get(id) || Promise.resolve();
  let release: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  playlistWrites.set(id, pending);
  await previous;
  try { return await action(); } finally {
    release!();
    if (playlistWrites.get(id) === pending) playlistWrites.delete(id);
  }
}

export async function spotifyEndpoint(endpoint: string, request: Request, previewId?: string) {
  try {
    const url = new URL(request.url);
    let result: any;
    switch (endpoint) {
      case "search": {
        const query = url.searchParams.get("q")?.trim();
        if (!query || query.length < 2 || query.length > 120) throw new SpotifyError("INVALID_QUERY", "Search must contain between 2 and 120 characters.", 400);
        const params = new URLSearchParams({ q: query, type: "track", limit: String(limit(url, 6, 10)) });
        const market = url.searchParams.get("market");
        if (market && /^[A-Z]{2}$/.test(market)) params.set("market", market);
        const data = await read(`/search?${params}`, "client", 120_000);
        const suggestions = (data.tracks?.items || []).filter(isTrack).map(trackInfo);
        result = { suggestions, count: suggestions.length, query };
        break;
      }
      case "getTrack":
      case "preview": {
        const id = validId(previewId || url.searchParams.get("id"));
        const track = await read(`/tracks/${id}`, "client", 86_400_000, ["1", "true"].includes(url.searchParams.get("force") || ""));
        result = endpoint === "preview" ? { preview_url: track.preview_url || null } : {
          ...trackInfo(track), isrc: track.external_ids?.isrc || null,
          releaseDate: track.album?.release_date || null, availableMarkets: track.available_markets?.length || 0,
        };
        break;
      }
      case "now-playing": {
        const data = await read("/me/player/currently-playing", "user", 5000);
        result = isTrack(data?.item) ? { ...songInfo(data.item), isPlaying: !!data.is_playing, progress: data.progress_ms || 0 }
          : { isPlaying: false, message: "No song currently playing" };
        break;
      }
      case "last-played":
      case "recent-tracks": {
        const data = await read(`/me/player/recently-played?limit=${endpoint === "last-played" ? 1 : limit(url)}`, "user");
        const tracks = (data?.items || []).filter(item => isTrack(item.track)).map(item => ({
          ...songInfo(item.track), playedAt: item.played_at, playedAtTimestamp: Date.parse(item.played_at),
        }));
        result = endpoint === "last-played" ? tracks[0] || { message: "No recently played tracks found" } : { tracks };
        break;
      }
      case "top-tracks":
      case "top-artists": {
        const type = endpoint === "top-tracks" ? "tracks" : "artists";
        const data = await read(`/me/top/${type}?limit=${limit(url)}&time_range=short_term`, "user", 300_000);
        result = type === "tracks" ? { tracks: (data.items || []).filter(isTrack).map(songInfo) } : {
          artists: (data.items || []).map(artist => ({ name: artist.name, image: artist.images?.[0]?.url || null,
            genres: artist.genres || [], popularity: Number.isFinite(artist.popularity) ? artist.popularity : null, url: artist.external_urls?.spotify })),
        };
        break;
      }
      case "playlists": {
        const data = await read("/me/playlists?limit=20", "user", 60_000);
        result = { playlists: (data.items || []).filter(Boolean).map(playlist => ({
          id: playlist.id, name: playlist.name, description: playlist.description || "", image: playlist.images?.[0]?.url || null,
          trackCount: playlist.items?.total ?? playlist.tracks?.total ?? 0,
          isPublic: !!playlist.public, isCollaborative: !!playlist.collaborative,
          url: playlist.external_urls?.spotify, owner: playlist.owner?.display_name || "",
        })) };
        break;
      }
      case "playlist-tracks": {
        const id = validId(url.searchParams.get("id") || config().playlistId);
        if (id !== config().playlistId) throw new SpotifyError("PLAYLIST_NOT_ALLOWED", "This playlist is not available on this site.", 403);
        const data = await playlistPage(id, url, ["1", "true"].includes(url.searchParams.get("force") || ""));
        result = { playlistId: id, tracks: (data.items || []).filter(item => isTrack(item.item ?? item.track)).map(item => ({
          ...trackInfo(item.item ?? item.track), addedAt: item.added_at, addedBy: item.added_by?.id || null, isLocal: !!item.is_local,
        })), total: data.total || 0, limit: data.limit || limit(url, 50), offset: data.offset || 0,
          next: data.next ? `${url.pathname}?${new URL(data.next).searchParams}` : null,
          previous: data.previous ? `${url.pathname}?${new URL(data.previous).searchParams}` : null };
        break;
      }
      case "addTrack":
      case "removeTrack": {
        const body = await writeBody(request);
        const id = validId(body.track_id);
        const playlist = validId(config().playlistId);
        if (endpoint === "removeTrack" && !validDeletionToken(body.delete_token, id)) {
          throw new SpotifyError("DELETE_NOT_AUTHORIZED", "Only songs added from this browser can be removed.", 403);
        }
        result = await withPlaylistLock(playlist, async () => {
          if (endpoint === "addTrack") {
            let offset = 0;
            while (true) {
              const pageUrl = new URL(request.url); pageUrl.searchParams.set("offset", String(offset)); pageUrl.searchParams.set("limit", "50");
              const page = await playlistPage(playlist, pageUrl, true);
              if ((page.items || []).some(item => (item.item ?? item.track)?.id === id)) {
                throw new SpotifyError("TRACK_ALREADY_ADDED", "This track is already in the playlist.", 409);
              }
              if (!page.next) break;
              offset += 50;
              if (offset > 10_000) throw new SpotifyError("PLAYLIST_TOO_LARGE", "This playlist cannot accept more submissions.", 409);
            }
          }
          const added = endpoint === "addTrack";
          const data = await spotifyRequest(`/playlists/${playlist}/items`, "user", {
            method: added ? "POST" : "DELETE",
            body: JSON.stringify(added ? { uris: [`spotify:track:${id}`] } : { items: [{ uri: `spotify:track:${id}` }] }),
          });
          dataCache.clear();
          return { status: "success", playlist_id: playlist, snapshot_id: data?.snapshot_id,
            ...(added ? { deleteToken: deletionToken(id), added_track: { spotify_id: id, spotify_url: `https://open.spotify.com/track/${id}`, playlist_url: `https://open.spotify.com/playlist/${playlist}` } }
              : { removed_track: { spotify_id: id, spotify_url: `https://open.spotify.com/track/${id}`, playlist_url: `https://open.spotify.com/playlist/${playlist}` } }),
            message: added ? "Track successfully added to playlist" : "Track successfully removed from playlist" };
        });
        break;
      }
      case "status": {
        const env = config(); const token = tokens.get("user");
        const authenticated = token?.key === env.key && token.expires > Date.now();
        result = { configured: true, hasRefreshToken: !!env.refreshToken, authenticated: !!authenticated,
          tokenExpires: authenticated ? new Date(token.expires).toISOString() : null };
        break;
      }
      default: throw new SpotifyError("NOT_FOUND", "Not found", 404);
    }
    return jsonResponse(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = error instanceof SpotifyError ? error : new SpotifyError("SPOTIFY_UNAVAILABLE", "Spotify music is temporarily unavailable.");
    return jsonResponse({ error: failure.message, message: failure.message, code: failure.code }, {
      status: failure.status, headers: { "Cache-Control": "no-store", ...(failure.retryAfter ? { "Retry-After": failure.retryAfter } : {}) },
    });
  }
}

export { optionsResponse as spotifyOptions };
