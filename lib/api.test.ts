import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTimelineYear } from "./api";

describe("fetchTimelineYear", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries transient failures before returning timeline data", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({ error: "Unable to load timeline" }, { status: 500 })
      )
      .mockResolvedValueOnce(
        Response.json({ error: "Unable to load timeline" }, { status: 500 })
      )
      .mockResolvedValueOnce(Response.json({ year: 2026, months: [] }));

    const timeline = await fetchTimelineYear(2026);

    expect(timeline).toEqual({ year: 2026, months: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws a generic frontend error after retries are exhausted", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { error: 'Invalid `prisma.run.findMany()` invocation: prepared statement "s1" already exists' },
        { status: 500 }
      )
    );

    await expect(fetchTimelineYear(2026)).rejects.toThrow("Unable to load timeline");
  });
});
