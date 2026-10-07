import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, chmod, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const SCOPES = ["user-read-currently-playing", "user-read-recently-played", "user-top-read",
  "playlist-read-private", "playlist-read-collaborative", "playlist-modify-public", "playlist-modify-private"];

export function readEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*?)\s*$/);
    if (!match) return [];
    const value = match[2];
    return [[match[1], /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value.replace(/\s+#.*$/, "")]];
  }));
}

export function updateEnv(text, values) {
  let updated = text;
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^(?:export\\s+)?${key}\\s*=.*$`, "m");
    updated = pattern.test(updated) ? updated.replace(pattern, () => line) : `${updated.trimEnd()}\n${line}\n`;
  }
  return updated;
}

export function validState(expected, received) {
  if (typeof received !== "string") return false;
  const a = Buffer.from(expected), b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function loopbackRedirect(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.search || url.hash || url.username || url.password) {
    throw new Error("Use an HTTP 127.0.0.1 redirect with an explicit port, for example http://127.0.0.1:1234/callback.");
  }
  return url;
}

async function main() {
  const { values } = parseArgs({ options: {
    "env-file": { type: "string", multiple: true }, "redirect-uri": { type: "string" }, help: { type: "boolean" },
  }});
  if (values.help) {
    console.log("Usage: npm run spotify:authorize -- [--env-file .env.local] [--redirect-uri http://127.0.0.1:1234/callback]");
    console.log("By default saves to .env.local and existing .env.prod. Add the redirect URI to your Spotify app first.");
    return;
  }
  const files = values["env-file"] || [".env.local"];
  if (!values["env-file"]) {
    try { await readFile(".env.prod", "utf8"); files.push(".env.prod"); } catch {}
  }
  const primary = await readFile(files[0], "utf8");
  const env = { ...readEnv(primary), ...process.env };
  const clientId = env.SPOTIFY_CLIENT_ID, clientSecret = env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your environment file first.");
  const redirect = loopbackRedirect(values["redirect-uri"] || env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:1234/callback");
  const state = randomBytes(32).toString("hex");
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: redirect.href,
    scope: SCOPES.join(" "), state, show_dialog: "true" }).toString();
  let completed = false;
  let exchanging = false;
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    const callback = new URL(request.url || "/", redirect.origin);
    if (request.method !== "GET" || callback.pathname !== redirect.pathname) {
      response.writeHead(404).end("Not found"); return;
    }
    if (!validState(state, callback.searchParams.get("state"))) {
      response.writeHead(400).end("Invalid login state. Restart the login command."); return;
    }
    if (completed || exchanging) { response.writeHead(409).end("This login is already being handled."); return; }
    if (callback.searchParams.has("error")) {
      response.writeHead(400).end("Spotify authorization was declined. Restart the command to try again."); return;
    }
    const code = callback.searchParams.get("code");
    if (!code) { response.writeHead(400).end("Missing Spotify authorization code."); return; }
    exchanging = true;
    try {
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect.href }),
        signal: AbortSignal.timeout(15_000),
      });
      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok || !tokens.refresh_token) throw new Error("Spotify could not complete authorization. Check your app's redirect URI, allowed users, and account access.");
      const granted = new Set((tokens.scope || "").split(" "));
      if (SCOPES.some(scope => !granted.has(scope))) throw new Error("Spotify did not grant all requested music permissions. Please reconnect with all permissions.");
      for (const file of files) {
        let text = "";
        try { text = await readFile(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
        const updated = updateEnv(text, { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret,
          SPOTIFY_REFRESH_TOKEN: tokens.refresh_token, SPOTIFY_REDIRECT_URI: redirect.href });
        const target = resolve(file), temp = `${target}.spotify-${randomBytes(6).toString("hex")}.tmp`;
        await writeFile(temp, updated, { mode: 0o600 });
        await rename(temp, target);
        await chmod(target, 0o600);
      }
      completed = true;
      response.end("Spotify connected. Your refresh token was saved securely. You can close this tab and restart Runny.");
      console.log(`Spotify connected. Saved credentials to ${files.join(", ")} without printing tokens. Restart the Next.js server.`);
      clearTimeout(expiry);
      server.close();
    } catch (error) {
      // Never print token payloads, authorization codes, or credential values.
      response.writeHead(502).end("Spotify connection failed. Check the terminal instructions and restart the command.");
      console.error(error instanceof Error && /^(Spotify|Set SPOTIFY)/.test(error.message) ? error.message : "Could not save Spotify authorization. Check your local environment file permissions.");
    } finally { exchanging = false; }
  });
  const expiry = setTimeout(() => { console.error("Spotify login expired. Restart the command to try again."); server.close(); }, 10 * 60_000);
  server.on("error", error => { clearTimeout(expiry); console.error(error.code === "EADDRINUSE" ? "The callback port is busy. Stop the other login command or choose another registered redirect URI." : "Could not start the local Spotify callback server."); process.exitCode = 1; });
  server.listen(Number(redirect.port), "127.0.0.1", () => {
    console.log(`Add this exact redirect URI in your Spotify Developer Dashboard: ${redirect.href}`);
    console.log("Then open this URL and authorize your Spotify account:");
    console.log(authUrl.href);
    console.log("Waiting for authorization. No refresh token will be printed.");
  });
  process.once("SIGINT", () => { clearTimeout(expiry); server.close(); });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error("Spotify login setup failed. Check the environment file and command arguments."); process.exitCode = 1; });
}
