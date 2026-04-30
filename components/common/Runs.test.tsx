import React, { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestRenderer from "react-test-renderer";
import Runs from "./Runs";
import type { RunsPage } from "@/types";

const pushMock = vi.hoisted(() => vi.fn());
const fetchRunsPageMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));

vi.mock("@/lib/api", () => ({
  fetchRunsPage: fetchRunsPageMock,
}));

function makeEmptyPage(): RunsPage {
  return {
    runs: [],
    nextCursor: null,
    totalRuns: 0,
    totalDistanceKm: 0,
  };
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Runs bootstrap behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      value: true,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "window", {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "document", {
      value: {
        hidden: false,
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: {
        onLine: true,
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      value: (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      value: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "IntersectionObserver", {
      value: class {
        observe() {}
        disconnect() {}
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, "ResizeObserver", {
      value: class {
        observe() {}
        disconnect() {}
      },
      configurable: true,
      writable: true,
    });
  });

  it("shows loading state first and then hydrates run cards from bootstrap fetch", async () => {
    const firstPage = deferred<RunsPage>();
    fetchRunsPageMock.mockReturnValueOnce(firstPage.promise);

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<Runs initialPage={makeEmptyPage()} />);
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain("Loading runs...");

    await act(async () => {
      firstPage.resolve({
        runs: [
          {
            id: "1",
            name: "Morning Run",
            date: "2026-04-01T00:00:00.000Z",
            distance_km: 10,
            elapsed_time_min: 55,
            splits: [],
          },
        ],
        nextCursor: null,
        totalRuns: 1,
        totalDistanceKm: 10,
      });
      await flushMicrotasks();
    });

    expect(fetchRunsPageMock).toHaveBeenCalledWith({ limit: 24 });
    expect(JSON.stringify(renderer!.toJSON())).toContain("Morning Run");
    expect(JSON.stringify(renderer!.toJSON())).toContain("Total Runs");
  });

  it("retries bootstrap after initial failure and eventually hydrates", async () => {
    fetchRunsPageMock
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({
        runs: [
          {
            id: "2",
            name: "Retry Run",
            date: "2026-04-02T00:00:00.000Z",
            distance_km: 5,
            elapsed_time_min: 30,
            splits: [],
          },
        ],
        nextCursor: null,
        totalRuns: 1,
        totalDistanceKm: 5,
      });

    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<Runs initialPage={makeEmptyPage()} />);
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expect(fetchRunsPageMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(renderer!.toJSON())).toContain("Retry Run");
  });
});
