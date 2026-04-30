"use client";
import React, { useEffect, useState } from "react";
import { Timeline } from "./timeline-ui";
import { useRouter } from "next/navigation";
import { fetchTimelineYear } from "@/lib/api";
import type { TimelineYearSummary } from "@/types";

// Month data array for May, June, July
const monthsData = [
	{
		key: "May",
		month: 5,
		year: 2025,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432188/1_mdhq5f.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432183/2_lx6d65.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/3_pu3pw9.jpg",
		],
		description:
			"Just Started Running, love seeing new places and feeling of accomplishment just after I finish a run",
		challenge: "I had a hairline fracture on my left foot, so I had to slow down.",
	},
	{
		key: "June",
		month: 6,
		year: 2025,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/4_l532dq.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/5_lrl7lw.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/6_k2eque.jpg",
		],
		description:
			"Started going on longer runs lately and for the first time, actually started focussing on enjoying the run itself & Not just finishing it.",
		challenge: "I was in my gav so couldn't run and fell sick every second week.",
	},
	{
		key: "July",
		month: 7,
		year: 2025,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/7_mncp5f.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/8_hewv9v.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432187/9_ubd6ea.jpg",
		],
		description: "The First week was my week of milestones, the rest was mehhh	",
		challenge: "With college starting struggled with making time for running",
	},
	{
		key: "August",
		month: 8,
		year: 2025,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
		],
		description: "Saw some real progress started hitting new paces and distances",
		challenge: "With college starting struggled with making time for running",
	},
	{
		key: "September",
		month: 9,
		year: 2025,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432197/13_ke9xps.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/14_pvhemv.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432191/15_pkt5y4.jpg",
		],
		description: "Didnt really Run much this month, college in full force",
		challenge: "The ultimate low point- physically and emotionally",
	},
	{
		key: "October",
		month: 10,
		year: 2025,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432193/16_pwiik2.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432192/17_astwir.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/18_g8d7b6.jpg",
		],
		description: "Tried getting back into shape after a rough September, didnt go too well",
		challenge: "Fell sick for 2 weeks straight, lost all strength to run",
	},
	{
		key: "November",
		month: 11,
		year: 2025,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/19_qghitb.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432187/20_x8ps41.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/21_qew9o1.jpg",
		],
		description: "Started again, frustrating to start from scratch",
		challenge: "Getting back to my former strength, after a break",
	},
	{
		key: "December",
		month: 12,
		year: 2025,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
		],
		description: "Really tried to end the year on a strong note, ran my first half Marathon!.",
		challenge: "I dont particularly like running in the cold mornings, had cold and cough.",
	},
	{
		key: "January",
		month: 1,
		year: 2026,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
		],
		description: "Registered for HSR 21k, training begins and started to increase my easy runs to 10k",
		challenge: "My left knee started hurting again, had to take it slow. My Right knee felt left out, so it started hurting as well",
	},
	{
		key: "February",
		month: 2,
		year: 2026,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
		],
		description: "And the Downfall begins, after my good start to the year slowed down drastically",
		challenge: "Was tired all the time, my legs were hurting and really struggled to make time for runs. Even on days I would have otherwise gone for a run I didn't go",
	},
	{
		key: "March",
		month: 3,
		year: 2026,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
		],
		description: "Marathon Postoned, and started a 150km challenge",
		challenge: "The heat makes it very hard to run, that combined with hefty college workload combined with the sweaty heat made long runs feel like hell",
	},
	{
		key: "April",
		month: 4,
		year: 2026,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
		],
		description: "New lows have been hit ran the first week and then stopped entirely after the first week",
		challenge: "Busy schedule with the Internship and the College submission and finals, and the heat and humidity is the worst thing in this world",
	},
];

const availableYears = Array.from(new Set(monthsData.map((month) => month.year))).sort(
	(a, b) => b - a
);
const AUTO_RETRY_MAX_ATTEMPTS = 3;
const AUTO_RETRY_DELAY_MS = 1500;

export function TimelineDemo() {
	const [selectedYear, setSelectedYear] = useState(availableYears[0]);
	const [timelineByYear, setTimelineByYear] = useState<Record<number, TimelineYearSummary>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [retrySignal, setRetrySignal] = useState(0);
	const [autoRetryAttempt, setAutoRetryAttempt] = useState(0);
	const [isMobile, setIsMobile] = useState(false);
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

	const selectedSummary = timelineByYear[selectedYear];

	// Build timeline data from month copy and lightweight year summary.
	const timelineData = monthsData
		.filter((month) => month.year === selectedYear)
		.map((month) => {
			const monthSummary = selectedSummary?.months.find((item) => item.month === month.month);
			const topRuns = monthSummary?.topRuns ?? [];
			const totalRuns = monthSummary?.totalRuns ?? 0;
			const totalDistance = monthSummary?.totalDistanceKm ?? 0;

			return {
				monthData: month,
				totalRuns,
				title: (
					<div className="flex flex-col gap-1 md:gap-1">
						<h2 className={`${['August', 'September', 'October'].includes(month.key) ? 'text-xl sm:text-2xl md:text-5xl' : 'text-2xl sm:text-3xl md:text-6xl'} font-bold tracking-tighter uppercase mb-2 md:mb-8 text-center md:text-left`}>
							<span className="text-white/80">{month.key} {month.year}</span>
						</h2>
						<div className="inline-flex w-full md:w-[60%] gap-2 md:gap-3 text-xs md:text-sm text-gray-400 font-semibold mb-1 bg-white/5 rounded-lg px-3 md:px-4 py-1.5 md:py-2 shadow-inner">
							<span>
								<span className="text-white font-bold">{totalRuns}</span> runs
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
									Top Runs This Month
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
							{month.images.map((src, idx) => {
								// Show only first 2 images on mobile, all 3 on desktop
								if (isMobile && idx >= 2) return null;
								
								return (
									<img
										key={src}
										src={src}
										alt={`Run ${month.key} ${idx + 1}`}
										className="rounded-lg md:rounded-xl h-28 sm:h-32 md:h-48 w-auto shadow-lg border-2 border-white/10 hover:scale-105 transition flex-shrink-0"
										style={{ objectFit: "contain" }}
									/>
								);
							})}
						</div>
					</div>
				),
			};
		})
		.filter((item) => item.totalRuns > 0);

	return (
		<div className="w-full bg-black py-8 md:py-12 pb-6 md:pb-8 px-0 md:px-8 font-montserrat overflow-x-hidden">
			<div className="max-w-6xl mx-auto flex flex-col items-center justify-center">
				<div className="mb-6 w-full max-w-md px-4">
					<div className="mb-3 flex items-end justify-between">
						<div>
							<div className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
								Running Since
							</div>
							<div className="mt-1 text-xl font-black leading-none text-white">
								2025 <span className="text-white/35">to</span> 2026
							</div>
						</div>
						<div className="text-right text-xs font-bold uppercase tracking-wider text-white/45">
							{selectedYear}
						</div>
					</div>

					<div className="relative rounded-full border border-white/10 bg-white/[0.06] p-1.5">
						<div className="absolute left-7 right-7 top-1/2 h-px -translate-y-1/2 bg-white/15" />
						<div className="relative grid grid-cols-2 gap-1">
							{availableYears.slice().reverse().map((year) => {
								const active = selectedYear === year;

								return (
									<button
										key={year}
										type="button"
										className={`relative flex h-12 items-center justify-center rounded-full text-sm font-black transition ${
											active
												? "bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.18)]"
												: "text-white/55 hover:bg-white/10 hover:text-white"
										}`}
										onClick={() => setSelectedYear(year)}
										aria-pressed={active}
									>
										<span className={`mr-2 size-2 rounded-full ${active ? "bg-black" : "bg-white/35"}`} />
										{year}
									</button>
								);
							})}
						</div>
					</div>
				</div>

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
				<button
					className="mt-6 md:mt-8 px-6 py-2.5 md:px-5 md:py-2 rounded-full bg-white/10 text-white text-sm font-semibold shadow hover:bg-white/20 transition border border-white/10 backdrop-blur active:scale-95"
					onClick={() => router.push("/runs")}
				>
					View All Runs →
				</button>
			</div>
		</div>
	);
}


export default TimelineDemo;
