import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const listTimelineYearSummaryMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/runService", () => ({
  listTimelineYearSummary: listTimelineYearSummaryMock,
}));

describe("GET /api/timeline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a sanitized error instead of leaking database details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    listTimelineYearSummaryMock.mockRejectedValueOnce(
      new Error(
        'Invalid `prisma.run.findMany()` invocation: prepared statement "s1" already exists'
      )
    );

    const response = await GET(new Request("http://localhost/api/timeline?year=2026"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Unable to load timeline" });
  });
});
