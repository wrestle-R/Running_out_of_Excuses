import { describe, expect, it, vi } from "vitest";
import type { RunsPage } from "@/types";
import Page from "./page";

const listRunsPageMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/runService", () => ({
  listRunsPage: listRunsPageMock,
}));

describe("/runs page route", () => {
  it("renders instant shell without blocking on listRunsPage", async () => {
    const element = await Page();
    const props = (element as { props: { initialPage: RunsPage; initialError?: string | null } })
      .props;

    expect(listRunsPageMock).not.toHaveBeenCalled();
    expect(props.initialPage).toEqual({
      runs: [],
      nextCursor: null,
      totalRuns: 0,
      totalDistanceKm: 0,
    });
    expect(props.initialError ?? null).toBeNull();
  });
});
