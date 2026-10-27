"use client";
import React, { useEffect, useRef, useState } from "react";
import { Timeline } from "./timeline-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchRunsPage, fetchTimelineYear } from "@/lib/api";
import { useRunnyPhotos, photoDisplayUrl } from "@/lib/runny-photos";
import type { TimelineYearSummary } from "@/types";

// Month data array for the running timeline copy.
type TimelinePeriod = {
	key: string;
	month: number;
	endMonth?: number;
	year: number;
	description: string;
	challenge: string;
};

const monthsData: TimelinePeriod[] = [
	{
		key: "May",
		month: 5,
		year: 2025,
		description:
			"Just Started Running, love seeing new places and feeling of accomplishment just after I finish a run",
		challenge: "I had a hairline fracture on my left foot, so I had to slow down.",
	},
	{
		key: "June",
		month: 6,
		year: 2025,
		description:
			"Started going on longer runs lately and for the first time, actually started focussing on enjoying the run itself & Not just finishing it.",
		challenge: "I was in my gav so couldn't run and fell sick every second week.",
	},
	{
		key: "July",
		month: 7,
		year: 2025,
		description: "The First week was my week of milestones, the rest was mehhh	",
		challenge: "With college starting struggled with making time for running",
	},
	{
		key: "August",
		month: 8,
		year: 2025,
		description: "Saw some real progress started hitting new paces and distances",
		challenge: "With college starting struggled with making time for running",
	},
	{
		key: "September",
		month: 9,
		year: 2025,
		description: "Didnt really Run much this month, college in full force",
		challenge: "The ultimate low point- physically and emotionally",
	},
	{
		key: "October",
		month: 10,
		year: 2025,
		description: "Tried getting back into shape after a rough September, didnt go too well",
		challenge: "Fell sick for 2 weeks straight, lost all strength to run",
	},
	{
		key: "November",
		month: 11,
		year: 2025,
		description: "Started again, frustrating to start from scratch",
		challenge: "Getting back to my former strength, after a break",
	},
	{
		key: "December",
		month: 12,
		year: 2025,
		description: "Really tried to end the year on a strong note, ran my first half Marathon!.",
		challenge: "I dont particularly like running in the cold mornings, had cold and cough.",
	},
	{
		key: "January",
		month: 1,
		year: 2026,
		description: "Registered for HSR 21k, training begins and started to increase my easy runs to 10k",
		challenge: "My left knee started hurting again, had to take it slow. My Right knee felt left out, so it started hurting as well",
	},
	{
		key: "February",
		month: 2,
		year: 2026,
		description: "And the Downfall begins, after my good start to the year slowed down drastically",
		challenge: "Was tired all the time, my legs were hurting and really struggled to make time for runs. Even on days I would have otherwise gone for a run I didn't go",
	},
	{
		key: "March",
		month: 3,
		year: 2026,
		description: "Marathon Postoned, and started a 150km challenge",
		challenge: "The heat makes it very hard to run, that combined with hefty college workload combined with the sweaty heat made long runs feel like hell",
	},
	{
		key: "April",
		month: 4,
		year: 2026,
		description: "New lows have been hit ran the first week and then stopped entirely after the first week",
		challenge: "Busy schedule with the Internship and the College submission and finals, and the heat and humidity is the worst thing in this world",
	},
	{
		key: "May",
		month: 5,
		year: 2026,
		description: "Had exams and tried to start running but it was too hot just couldnt",
		challenge: "Lows go even further need to run more",
	},
	{
		key: "June–October",
		month: 6,
		endMonth: 10,
		year: 2026,
		description: "Cest fini, we dont talk about this",
		challenge: "Passion burnt out and didnt really feel like running",
	},
];

const availableYears = Array.from(new Set(monthsData.map((month) => month.year))).sort(
	(a, b) => b - a
);
const AUTO_RETRY_MAX_ATTEMPTS = 3;
const AUTO_RETRY_DELAY_MS = 1500;
const INITIAL_TIMELINE_YEAR = 2026;
const PRELOAD_TIMELINE_YEAR = 2025;
const RUNS_WARMUP_LIMIT = 24;

export function TimelineDemo() {
	const [selectedYear, setSelectedYear] = useState(availableYears[0]);
	const [timelineByYear, setTimelineByYear] = useState<Record<number, TimelineYearSummary>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [retrySignal, setRetrySignal] = useState(0);
	const [autoRetryAttempt, setAutoRetryAttempt] = useState(0);
	const [isMobile, setIsMobile] = useState(false);
	const hasStartedRunsWarmupRef = useRef(false);
	const hasStartedTimelineWarmupRef = useRef(false);
	const router = useRouter();

	// Handle window resize to detect mobile
	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth < 768);
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		let cancelled = false;
		let retryTimer: ReturnType<typeof setTimeout> | null = null;

		async function loadTimelineYear() {
			if (timelineByYear[selectedYear]) {
				setLoading(false);
				setError(null);
				setAutoRetryAttempt(0);
				return;
			}

			try {
				setLoading(true);
				setError(null);
				const summary = await fetchTimelineYear(selectedYear);

				if (cancelled) return;

				setTimelineByYear((current) => ({
					...current,
					[selectedYear]: summary,
				}));
				setAutoRetryAttempt(0);
			} catch (e) {
				if (!cancelled) {
					console.error("Unable to load timeline:", e);
					setError("Unable to load timeline");
					setAutoRetryAttempt((current) => {
						if (current >= AUTO_RETRY_MAX_ATTEMPTS) return current;
						const nextAttempt = current + 1;
						retryTimer = setTimeout(() => {
							setRetrySignal((value) => value + 1);
						}, AUTO_RETRY_DELAY_MS * nextAttempt);
						return nextAttempt;
					});
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		loadTimelineYear();

		return () => {
			cancelled = true;
			if (retryTimer) {
				clearTimeout(retryTimer);
			}
		};
	}, [selectedYear, timelineByYear, retrySignal]);

	useEffect(() => {
		if (hasStartedRunsWarmupRef.current) return;
		hasStartedRunsWarmupRef.current = true;
		let cancelled = false;

		async function warmRunsData() {
			const prefetchRunsRoutePromise = Promise.resolve(router.prefetch("/runs"));
			const warmRunsDataPromise = fetchRunsPage({ limit: RUNS_WARMUP_LIMIT });
			const warmupResults = await Promise.allSettled([
				prefetchRunsRoutePromise,
				warmRunsDataPromise,
			]);
			const warmupLabels = ["runs-route-prefetch", "runs-page-cache"];

			warmupResults.forEach((result, index) => {
				if (cancelled) return;
				if (result.status === "rejected") {
					console.error(`Background warmup failed for ${warmupLabels[index]}:`, result.reason);
				}
			});
		}

		void warmRunsData();

		return () => {
			cancelled = true;
		};
	}, [router]);

	useEffect(() => {
		if (hasStartedTimelineWarmupRef.current) return;
		if (!timelineByYear[INITIAL_TIMELINE_YEAR]) return;

		hasStartedTimelineWarmupRef.current = true;
		let cancelled = false;

		async function warmTimelineData() {
			const warmTimelineResult = await Promise.allSettled([
				fetchTimelineYear(PRELOAD_TIMELINE_YEAR),
			]);

			if (cancelled) return;

			const [timelineResult] = warmTimelineResult;
			if (timelineResult.status === "fulfilled") {
				setTimelineByYear((current) => ({
					...current,
					[PRELOAD_TIMELINE_YEAR]: timelineResult.value,
				}));
				return;
			}

			console.error("Background warmup failed for timeline-2025:", timelineResult.reason);
		}

		void warmTimelineData();

		return () => {
			cancelled = true;
		};
	}, [timelineByYear]);

	const photos = useRunnyPhotos();
	const selectedSummary = timelineByYear[selectedYear];

	// Build timeline data from month copy and lightweight year summary.
	const timelineData = monthsData
		.filter((month) => month.year === selectedYear)
		.map((month) => {
			const periodMonths = selectedSummary?.months.filter(
				(item) => item.month >= month.month && item.month <= (month.endMonth ?? month.month)
			) ?? [];
			const topRuns = periodMonths.flatMap((item) => item.topRuns)
				.sort((a, b) => b.distance_km - a.distance_km)
				.slice(0, 3);
			const totalRuns = periodMonths.reduce((total, item) => total + item.totalRuns, 0);
			const totalDistance = periodMonths.reduce((total, item) => total + item.totalDistanceKm, 0);

			return {
				monthData: month,
				totalRuns,
				title: (
					<div className="flex flex-col gap-1 md:gap-1">
						<h2 className={`${month.endMonth ? 'text-xl sm:text-2xl md:text-4xl' : ['August', 'September', 'October'].includes(month.key) ? 'text-xl sm:text-2xl md:text-5xl' : 'text-2xl sm:text-3xl md:text-6xl'} font-bold tracking-tighter uppercase mb-2 md:mb-8 text-center md:text-left`}>
							<span className="text-white/80">{month.key} {month.year}</span>
						</h2>
						<div className="inline-flex w-full md:w-[60%] gap-2 md:gap-3 text-xs md:text-sm text-gray-400 font-semibold mb-1 bg-white/5 rounded-lg px-3 md:px-4 py-1.5 md:py-2 shadow-inner">
							<span>
								<span className="text-white font-bold">{totalRuns}</span> {month.endMonth ? "activities" : "runs"}
							</span>
							<span className="opacity-60">|</span>
							<span>
								<span className="text-white font-bold">
									{totalDistance.toFixed(2)}
								</span>{" "}
								km
							</span>
						</div>
						<div className="text-xs md:text-sm text-gray-400 mt-1 leading-relaxed">
							<span className="font-bold text-white">Challenge:</span> {month.challenge}
						</div>
					</div>
				),
				content: (
					<div>
						<div className="text-xs sm:text-sm md:text-lg text-gray-300 mb-3 md:mb-3 font-medium italic text-left md:text-center leading-relaxed">
							{month.description}
						</div>
						{/* Show top runs if available */}
						{topRuns.length > 0 && (
							<div className="mb-3 md:mb-4">
								<h4 className="text-white/60 text-xs md:text-sm font-semibold mb-2 md:mb-2 text-left md:text-center">
									{month.endMonth ? "Top runs in this period" : "Top Runs This Month"}
								</h4>
								<div className="flex flex-col sm:flex-row sm:flex-wrap justify-start md:justify-center gap-2 md:gap-2">
									{topRuns.map((run, idx) => (
										<div
											key={run.id}
											className="bg-white/10 rounded-lg px-3 md:px-3 py-2 md:py-2 text-xs md:text-xs"
										>
											<span className="text-white font-bold">
												{run.distance_km}km
											</span>
											<span className="text-white/60 ml-1">- {run.name}</span>
										</div>
									))}
								</div>
							</div>
						)}
						<div className="flex flex-row mt-3 md:mt-4 gap-2 md:gap-4 justify-start md:justify-center flex-wrap overflow-hidden">
							{photos.filter(photo => photo.placement === "timeline" && photo.year === month.year && photo.month === month.month).map((photo, idx) => {
								// Show only first 2 images on mobile, all 3 on desktop
								if (isMobile && idx >= 2) return null;

								return (
									<figure key={photo.id} tabIndex={photo.caption ? 0 : undefined} className="group relative max-w-full focus-visible:outline-2 focus-visible:outline-white">
									<img
										src={photoDisplayUrl(photo.url)}
										alt={photo.alt}

										className="rounded-lg md:rounded-xl h-28 sm:h-32 md:h-48 w-auto shadow-lg border-2 border-white/10 hover:scale-105 transition flex-shrink-0"
										style={{ objectFit: "contain" }}
									/>
									{photo.caption && <figcaption className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/85 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">{photo.caption}</figcaption>}
									</figure>
								);
							})}
						</div>
					</div>
				),
			};
		});

	return (
		<div className="w-full bg-black py-8 md:py-12 pb-6 md:pb-8 px-0 md:px-8 font-montserrat overflow-x-hidden">
			<div className="max-w-6xl mx-auto flex flex-col items-center justify-center">
				<div className="mb-6 flex justify-center border-b border-white/15" aria-label="Choose a timeline year">
					<div className="flex gap-5 sm:gap-6" role="group" aria-label="Timeline year">
						{availableYears.slice().reverse().map((year) => {
							const active = selectedYear === year;
							return (
								<button
									key={year}
									type="button"
									className={`-mb-px min-h-11 border-b-2 px-3 py-3 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:px-4 sm:pb-5 sm:pt-3 sm:text-base ${active ? "border-white text-white" : "border-transparent text-white/45 hover:text-white/80"}`}
									onClick={() => setSelectedYear(year)}
									aria-pressed={active}
									aria-controls="running-timeline-content"
								>
									{year}
								</button>
							);
						})}
					</div>
				</div>

				<div id="running-timeline-content" className="w-full" aria-busy={loading} aria-labelledby="running-timeline-heading">

				{loading && (
					<div className="w-full flex items-center justify-center text-gray-400 py-12">
						<div className="flex flex-col items-center gap-4">
							<svg
								className="animate-spin h-8 w-8 text-pure-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8v8z"
								></path>
							</svg>
							<span>Loading {selectedYear} timeline...</span>
						</div>
					</div>
				)}

				{error && !loading && (
					<div className="w-full max-w-xl rounded-lg border border-white/10 bg-white/[0.04] px-6 py-10 text-center">
						<p className="text-lg font-bold text-white">Unable to load timeline.</p>
						<p className="mt-2 text-sm text-white/45">
							{autoRetryAttempt < AUTO_RETRY_MAX_ATTEMPTS
								? "Retrying automatically..."
								: "Please retry in a moment."}
						</p>
						<button
							type="button"
							className="mt-5 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
							onClick={() => {
								setAutoRetryAttempt(0);
								setTimelineByYear((current) => {
									const next = { ...current };
									delete next[selectedYear];
									return next;
								});
								setRetrySignal((value) => value + 1);
							}}
						>
							Retry
						</button>
					</div>
				)}

				{!loading && !error && <Timeline data={timelineData} />}
				</div>
				<Link
					href="/runs"
					className="mt-6 md:mt-8 px-6 py-2.5 md:px-5 md:py-2 rounded-full bg-white/10 text-white text-sm font-semibold shadow hover:bg-white/20 transition border border-white/10 backdrop-blur active:scale-95"
				>
					View All Runs →
				</Link>
			</div>
		</div>
	);
}


export default TimelineDemo;
