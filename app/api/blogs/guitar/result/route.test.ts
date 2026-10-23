import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/services/blogs/guitar/guitarService", async importOriginal => ({ ...await importOriginal<typeof import("@/services/blogs/guitar/guitarService")>(), saveQuiz: vi.fn() }));
import repertoire from "@/services/blogs/guitar/repertoire.json";
import { POST, OPTIONS } from "./route";
import { saveQuiz, RunConflict } from "@/services/blogs/guitar/guitarService";

const body = { runId: "f1826582-b56c-4504-9710-32fb08995915", version: "v1", answers: ["shape", "blue", "dandelions", "snowman", "505"].map(songId => ({ songId, answerId: songId })) };
const request = (value: unknown) => new Request("http://localhost/api/blogs/guitar/result", { method: "POST", body: JSON.stringify(value) });
beforeEach(() => { vi.mocked(saveQuiz).mockReset(); });
describe("guitar results endpoint", () => {
  it("returns a CORS preflight and an uncached percentile without exposing scores or answers", async () => {
    expect(OPTIONS().status).toBe(204);
    vi.mocked(saveQuiz).mockResolvedValue({ percentile: 75, previousRuns: 4 });
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ percentile: 75, previousRuns: 4 });
  });
  it("rejects direct timed results even with a fabricated zero time", async () => {
    const answers=repertoire.versions.v4.slice(0,10).map(songId=>({songId,answerId:songId}));
    expect((await POST(request({...body,version:"v4",elapsedMs:0,answers}))).status).toBe(400);
    expect(saveQuiz).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON without touching the database", async () => {
    const response = await POST(new Request("http://localhost/", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(saveQuiz).not.toHaveBeenCalled();
  });
  it("bounds bodies even when Content-Length is absent", async () => {
    expect((await POST(request({ padding: "x".repeat(5000) }))).status).toBe(413);
    expect(saveQuiz).not.toHaveBeenCalled();
  });
  it("rejects reuse of a run ID with changed answers", async () => {
    vi.mocked(saveQuiz).mockRejectedValue(new RunConflict());
    expect((await POST(request(body))).status).toBe(409);
  });
  it("returns an honest retryable failure when persistence fails", async () => {
    vi.mocked(saveQuiz).mockRejectedValue(new Error("private connection details"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request(body));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private");
    spy.mockRestore();
  });
});
