"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock3,
  Footprints,
  Gauge,
  Loader2,
  Route,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRunsPage } from "@/lib/api";
import type { RunActivity, RunSplit, RunsPage } from "@/types";
import { cn } from "@/lib/utils";

const RUN_PAGE_LIMIT = 24;
const MASONRY_ROW_HEIGHT = 8;
const MASONRY_GAP = 20;
const DEFAULT_CARD_SPAN = 12;
const runnyBlack = "/runny-black-nobg.png";

function paceToSpeed(
  pace: string | number | null | undefined,
  distanceKm: number,
  elapsedTimeMin: number
) {
  let paceValue = pace;

  if (pace === null || pace === undefined || pace === "N/A" || pace === "") {
    if (distanceKm && elapsedTimeMin && distanceKm > 0) {
      paceValue = elapsedTimeMin / distanceKm;
    } else {
      return 0;
    }
  }

  if (typeof paceValue === "string" && paceValue.includes(":")) {
    const [min, rest] = paceValue.split(":");
    const [sec] = rest.split("/");
    const totalMin = parseInt(min, 10) + parseInt(sec, 10) / 60;
    if (!totalMin) return 0;
    return +(60 / totalMin).toFixed(2);
  }

  const paceNum = parseFloat(String(paceValue));
  if (Number.isNaN(paceNum) || !paceNum) return 0;
  return +(60 / paceNum).toFixed(2);
}

function isWalk(
  pace: string | number | null | undefined,
  distanceKm: number,
  elapsedTimeMin: number
) {
  let paceValue = pace;

  if (pace === null || pace === undefined || pace === "N/A" || pace === "") {
    if (distanceKm && elapsedTimeMin && distanceKm > 0) {
      paceValue = elapsedTimeMin / distanceKm;
    } else {
      return false;
    }
  }

  if (typeof paceValue === "string" && paceValue.includes(":")) {
    const [min, rest] = paceValue.split(":");
    const [sec] = rest.split("/");
    const totalSec = parseInt(min, 10) * 60 + parseInt(sec, 10);
    return totalSec >= 600;
  }

  const paceNum = parseFloat(String(paceValue));
  if (Number.isNaN(paceNum)) return false;
  return paceNum >= 10;
}

function formatPace(
  pace: string | number | null | undefined,
  distanceKm: number,
  elapsedTimeMin: number
) {
  if (pace !== null && pace !== undefined && pace !== "N/A" && pace !== "") {
    if (typeof pace === "string" && pace.includes(":")) {
      return pace;
    }

    const paceNum = parseFloat(String(pace));
    if (paceNum && !Number.isNaN(paceNum)) {
      const minutes = Math.floor(paceNum);
      const seconds = Math.round((paceNum - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
    }
  }

  if (distanceKm && elapsedTimeMin && distanceKm > 0) {
    const calculatedPace = elapsedTimeMin / distanceKm;
    const minutes = Math.floor(calculatedPace);
    const seconds = Math.round((calculatedPace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
  }

  return "—";
}

function formatTime(minutes: string | number) {
  const value = parseFloat(String(minutes));
  if (!Number.isFinite(value)) return "—";

  const mins = Math.floor(value);
  const secs = Math.round((value - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatSplitPace(split: RunSplit) {
  const pace = split.pace ?? split.pace_min_per_km;

  if (typeof pace === "string" && pace.includes(":")) {
    return pace;
  }

  const paceNum = parseFloat(String(pace ?? ""));
  if (!paceNum || Number.isNaN(paceNum)) return "—";

  const minutes = Math.floor(paceNum);
  const seconds = Math.round((paceNum - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function metricValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function RunIcon({ walk }: { walk: boolean }) {
  if (walk) {
    return <Footprints className="size-10 text-pure-black" />;
  }

  return (
    <Image src={runnyBlack} alt="" width={44} height={44} className="size-11" priority={false} />
  );
}

function MasonryItem({ children }: { children: React.ReactNode }) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const [span, setSpan] = useState(DEFAULT_CARD_SPAN);

  useEffect(() => {
    const item = itemRef.current;
    if (!item) return;

    const updateSpan = () => {
      const height = item.getBoundingClientRect().height;
      setSpan(Math.ceil((height + MASONRY_GAP) / (MASONRY_ROW_HEIGHT + MASONRY_GAP)));
    };

    updateSpan();

    const observer = new ResizeObserver(updateSpan);
    observer.observe(item);

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ gridRowEnd: `span ${span}` }}>
      <div ref={itemRef}>{children}</div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/45">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="truncate text-sm font-extrabold text-pure-black">{value}</div>
    </div>
  );
}

function SplitRows({ splits }: { splits: RunSplit[] }) {
  if (splits.length === 0) {
    return <p className="text-sm font-medium text-pure-white/45">No splits recorded.</p>;
  }

  return (
    <div className="grid gap-1.5">
      {splits.map((split, index) => (
        <div
          key={`${split.km ?? index}-${index}`}
          className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-white/[0.07] px-3 py-2 text-sm"
        >
          <span className="font-semibold text-pure-white/75">KM {split.km ?? index + 1}</span>
          <span className="font-extrabold text-pure-white">{formatSplitPace(split)}</span>
        </div>
      ))}
    </div>
  );
}

function RunCard({ run }: { run: RunActivity }) {
  const [open, setOpen] = useState(false);
  const walk = isWalk(run.pace_min_per_km, run.distance_km, run.elapsed_time_min);
  const pace = formatPace(run.pace_min_per_km, run.distance_km, run.elapsed_time_min);
  const speed = paceToSpeed(run.pace_min_per_km, run.distance_km, run.elapsed_time_min);
  const description =
    run.description && run.description.trim() && run.description !== "No description 😶"
      ? run.description.trim()
      : null;

  return (
    <Card className="group overflow-hidden rounded-lg border-white/10 bg-pure-white py-0 text-pure-black shadow-none transition-transform duration-200 hover:-translate-y-1">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="gap-5 px-5 pt-5 pb-0">
          <div className="flex items-start justify-between gap-4">
            <RunIcon walk={walk} />
            <div className="flex flex-col items-end gap-2 text-right">
              <Badge className="rounded-full bg-pure-black px-2.5 py-1 text-pure-white hover:bg-pure-black">
                {walk ? "Walk" : "Run"}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-black/45">
                <Calendar className="size-3.5" />
                {formatDate(run.date)}
              </div>
            </div>
          </div>

          <div className="min-h-[96px]">
            <CardTitle className="line-clamp-2 text-2xl font-black leading-[1.05] tracking-normal text-pure-black">
              {run.name || "Run"}
            </CardTitle>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-6xl font-black leading-none tracking-normal">
                {metricValue(run.distance_km)}
              </span>
              <span className="mb-1 text-2xl font-extrabold text-black/45">km</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 gap-2">
            <StatPill icon={Gauge} label="Pace" value={pace} />
            <StatPill icon={Clock3} label="Time" value={formatTime(run.elapsed_time_min)} />
          </div>

          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="mt-4 h-10 w-full rounded-md border border-black/10 bg-transparent text-pure-black hover:bg-pure-black hover:text-pure-white"
            >
              <span>{open ? "Hide details" : "View details"}</span>
              <ChevronDown
                className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent>
          <div className="border-t border-white/10 bg-pure-black p-5 text-pure-white">
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-pure-white/45">Speed</div>
                <div className="mt-1 text-xl font-black">{speed ? `${speed} km/h` : "—"}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-pure-white/45">Splits</div>
                <div className="mt-1 text-xl font-black">{run.splits.length}</div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="mb-3 text-xs font-bold uppercase text-pure-white/45">
                  Kilometer Splits
                </div>
                <SplitRows splits={run.splits} />
              </div>

              {description && (
                <div className="border-t border-white/10 pt-4">
                  <div className="mb-2 text-xs font-bold uppercase text-pure-white/45">Notes</div>
                  <p className="break-words text-sm font-medium leading-relaxed text-pure-white/75">
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function RunCardSkeleton() {
  return (
    <Card className="rounded-lg border-white/10 bg-pure-white py-0">
      <CardHeader className="gap-5 px-5 pt-5 pb-0">
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="size-12 rounded-full bg-black/10" />
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-16 rounded-full bg-black/10" />
            <Skeleton className="h-4 w-24 bg-black/10" />
          </div>
        </div>
        <div className="min-h-[96px]">
          <Skeleton className="h-7 w-4/5 bg-black/10" />
          <Skeleton className="mt-4 h-14 w-32 bg-black/10" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-lg bg-black/10" />
          <Skeleton className="h-14 rounded-lg bg-black/10" />
        </div>
        <Skeleton className="mt-4 h-10 rounded-md bg-black/10" />
      </CardContent>
    </Card>
  );
}

export default function Runs({
  initialPage,
  initialError = null,
}: {
  initialPage: RunsPage;
  initialError?: string | null;
}) {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const [runs, setRuns] = useState(initialPage.runs);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedIds = useMemo(() => new Set(runs.map((run) => run.id)), [runs]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingRef.current) return;

    loadingRef.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await fetchRunsPage({ cursor: nextCursor, limit: RUN_PAGE_LIMIT });
      setRuns((currentRuns) => {
        const currentIds = new Set(currentRuns.map((run) => run.id));
        const newRuns = page.runs.filter((run) => !currentIds.has(run.id));
        return [...currentRuns, ...newRuns];
      });
      setNextCursor(page.nextCursor);
    } catch (err) {
      console.error("Unable to load more runs:", err);
      setError("Unable to load more runs");
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "700px 0px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  return (
    <section className="min-h-screen bg-pure-black px-4 py-10 text-pure-white md:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <Button
              type="button"
              variant="ghost"
              className="mb-8 rounded-full border border-white/10 bg-white/10 text-pure-white hover:bg-pure-white hover:text-pure-black"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="size-4" />
              Back to Home
            </Button>

            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-normal text-pure-white md:text-7xl">
              Every Step <span className="text-pure-white/70">Counts</span>
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-80">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs font-bold uppercase text-pure-white/45">Total Runs</div>
              <div className="mt-2 text-3xl font-black">{initialPage.totalRuns}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs font-bold uppercase text-pure-white/45">Distance</div>
              <div className="mt-2 text-3xl font-black">
                {initialPage.totalDistanceKm.toFixed(1)}
                <span className="ml-1 text-base text-pure-white/50">km</span>
              </div>
            </div>
          </div>
        </header>

        {runs.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-6 py-20 text-center">
            {initialError ? (
              <>
                <p className="text-xl font-bold text-pure-white/70">Unable to load runs.</p>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium text-pure-white/40">
                  {initialError}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-6 rounded-full border border-white/10 bg-white/10 text-pure-white hover:bg-pure-white hover:text-pure-black"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-pure-white/70">No activities found yet.</p>
                <p className="mt-2 text-sm font-medium text-pure-white/40">
                  Activities will sync automatically.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 [grid-auto-flow:dense] [grid-auto-rows:8px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {runs.map((run) => (
              <MasonryItem key={run.id}>
                <RunCard run={run} />
              </MasonryItem>
            ))}

            {loadingMore &&
              Array.from({ length: 4 }).map((_, index) => (
                <MasonryItem key={index}>
                  <RunCardSkeleton />
                </MasonryItem>
              ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-12" aria-hidden="true" />

        <div className="mt-6 flex min-h-10 items-center justify-center text-sm font-semibold text-pure-white/45">
          {loadingMore && (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Loading more runs
            </span>
          )}

          {error && !loadingMore && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full border border-white/10 bg-white/10 text-pure-white hover:bg-pure-white hover:text-pure-black"
              onClick={loadMore}
            >
              Retry loading runs
            </Button>
          )}

          {!nextCursor && runs.length > 0 && !loadingMore && !error && (
            <span>All {loadedIds.size} runs loaded.</span>
          )}
        </div>

        <footer className="mt-12 flex justify-center pb-6">
          <a
            className="inline-flex items-center rounded bg-strava px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            href="https://strava.com/athletes/159046302"
            target="_blank"
            rel="noreferrer"
          >
            Follow me on Strava
          </a>
        </footer>
      </div>
    </section>
  );
}
