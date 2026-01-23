import React, { useEffect, useState } from "react";
import { Timeline } from "./timeline-ui";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config.js";

// Month data array for May, June, July
const monthsData = [
	{
		key: "May",
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
		year: 2026,
		images: [
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
			"https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
		],
		description: "Registered for HSR 21k, training begins and started to increase my easy runs to 10k",
		challenge: "My left knee started hurting again, had to take it slow. My Right knee felt left out, so it started hurting as well",
	},
];

export function TimelineDemo() {
	const [runs, setRuns] = useState({});
	const [loading, setLoading] = useState(true);
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
	const navigate = useNavigate();

	// Handle window resize to detect mobile
	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth < 768);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		async function fetchRunsFromFirebase() {
			try {
				const snapshot = await getDocs(collection(db, "strava_activities"));
				const allRuns = [];
				snapshot.forEach((doc) => {
					const data = doc.data();

					// Parse date string to JS Date - handle ISO and M/D/YYYY format
					let jsDate = null;
					if (typeof data.date === "string") {
						const isoDate = new Date(data.date);
						if (!isNaN(isoDate.getTime())) {
							jsDate = isoDate;
						} else {
							// Parse "2/15/2025" as M/D/YYYY (US format)
							const dateParts = data.date.split("/");
							if (dateParts.length === 3) {
								const [month, day, year] = dateParts;
								// Create date with proper month (0-indexed in JS)
								jsDate = new Date(
									parseInt(year),
									parseInt(month) - 1,
									parseInt(day)
								);
							}
						}
					}

					// Debug log to see what we're getting
					console.log("Processing activity:", {
						name: data.name,
						originalDate: data.date,
						parsedDate: jsDate,
						month: jsDate
							? jsDate.toLocaleString("default", { month: "long" })
							: "Invalid",
					});

					allRuns.push({ ...data, jsDate });
				});

				// Group runs by month name (May, June, July)
				const byMonth = {};
				monthsData.forEach((m) => (byMonth[m.key] = []));

				allRuns.forEach((run) => {
					if (!run.jsDate || isNaN(run.jsDate)) {
						console.warn("Invalid date for run:", run.name, run.date);
						return;
					}

					const month = run.jsDate.toLocaleString("default", { month: "long" });
					const year = run.jsDate.getFullYear();

					// Include runs from 2025 and 2026, matching the months in monthsData
					monthsData.forEach((m) => {
						if (month === m.key && year === m.year) {
							byMonth[m.key].push(run);
						}
					});
				});

				console.log("Grouped runs by month:", byMonth);
				setRuns(byMonth);
			} catch (e) {
				console.error("Error fetching runs from Firebase:", e);
				// fallback to empty
				const empty = {};
				monthsData.forEach((m) => (empty[m.key] = []));
				setRuns(empty);
			} finally {
				setLoading(false);
			}
		}
		fetchRunsFromFirebase();
	}, []);

	// Wait for runs to load
	const ready = monthsData.every((m) => Array.isArray(runs[m.key]));

	if (!ready || loading) {
		return (
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
					<span>Loading timeline data...</span>
				</div>
			</div>
		);
	}

	// Build timeline data from monthsData and runs - ONLY include months with data
	const timelineData = monthsData
		.map((month) => {
			const allRuns = runs[month.key] || [];
			const topRuns = allRuns
				.slice()
				.sort((a, b) => b.distance_km - a.distance_km)
				.slice(0, 3);
			const totalRuns = allRuns.length;
			const totalDistance = allRuns.reduce(
				(sum, run) => sum + (typeof run.distance_km === "number" ? run.distance_km : 0),
				0
			);

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
				<Timeline data={timelineData} />
				<button
					className="mt-6 md:mt-8 px-6 py-2.5 md:px-5 md:py-2 rounded-full bg-white/10 text-white text-sm font-semibold shadow hover:bg-white/20 transition border border-white/10 backdrop-blur active:scale-95"
					onClick={() => navigate("/runs")}
				>
					View All Runs →
				</button>
			</div>
		</div>
	);
}


export default TimelineDemo;
