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
    images: ["/1.jpg", "/8.jpg", "/12.jpg"],
    description: "Just Started Running, love seeing new places and feeling of accomplishment just after I finish a run",
    challenge: "I had a hairline fracture on my left foot, so I had to slow down.",
  },
  {
    key: "June",
    year: 2025,
    images: ["/2.jpg", "/3.jpg", "/7.jpg"],
    description: "Started going on longer runs lately and for the first time, actually started focussing on enjoying the run itself & Not just finishing it.",
    challenge: "I was in my gav so couldn't run and fell sick every second week.",
  },
  {
    key: "July",
    year: 2025,
    images: ["/9.jpg", "/9.jpg", "/9.jpg"],
    description: "Pushed myself further, started to see real progress and felt stronger.",
    challenge: "With college starting struggled with making time for running",
  },
];

export function TimelineDemo() {
  const [runs, setRuns] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRunsFromFirebase() {
      try {
        const snapshot = await getDocs(collection(db, "strava_activities"));
        const allRuns = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Defensive: parse date string to JS Date
          let jsDate = null;
          if (typeof data.date === "string") {
            // Accepts "01/06/2025" as dd/mm/yyyy
            const [day, month, year] = data.date.split("/");
            jsDate = new Date(`${year}-${month}-${day}`);
          }
          allRuns.push({ ...data, jsDate });
        });

        // Group runs by month name (May, June, July)
        const byMonth = {};
        monthsData.forEach((m) => (byMonth[m.key] = []));
        allRuns.forEach((run) => {
          if (!run.jsDate || isNaN(run.jsDate)) return;
          const month = run.jsDate.toLocaleString("default", { month: "long" });
          monthsData.forEach((m) => {
            if (month === m.key) byMonth[m.key].push(run);
          });
        });
        setRuns(byMonth);
      } catch (e) {
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
        Loading...
      </div>
    );
  }

  // Build timeline data from monthsData and runs
  const timelineData = monthsData.map((month) => {
    const allRuns = runs[month.key] || [];
    const topRuns = allRuns.slice().sort((a, b) => b.distance_km - a.distance_km).slice(0, 3);
    const totalRuns = allRuns.length;
    const totalDistance = allRuns.reduce(
      (sum, run) => sum + (typeof run.distance_km === "number" ? run.distance_km : 0),
      0
    );
    return {
      title: (
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-8 text-center">
            <span className="text-white/80">{month.key}</span> {month.year}
          </h2>
          <div className="inline-flex w-[60%] gap-3 text-xs md:text-sm text-gray-400 font-semibold mb-1 bg-white/5 rounded-lg px-4 py-2 shadow-inner">
            <span>
              <span className="text-white font-bold">{totalRuns}</span> runs
            </span>
            <span className="opacity-60">|</span>
            <span>
              <span className="text-white font-bold">{totalDistance.toFixed(2)}</span> km
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            <span className="font-bold text-white">Challenge:</span> {month.challenge}
          </div>
        </div>
      ),
      content: (
        <div>
          <div className="text-base md:text-lg text-gray-300 mb-3 font-medium italic text-center">
            {month.description}
          </div>
          <div className="flex pl-6 flex-row mt-4 gap-4 justify-center">
            {month.images.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt={`Run ${month.key} ${idx + 1}`}
                className="rounded-xl md:h-48 w-auto shadow-lg border-2 border-white/10 hover:scale-105 transition"
                style={{ objectFit: "contain", height: "16rem" }}
              />
            ))}
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="w-full bg-gradient-to-b from-black via-zinc-950 to-black py-12 pb-8 px-2 md:px-8 font-montserrat">
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center">
        <Timeline data={timelineData} />
        <button
          className="mt-8 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold shadow hover:bg-white/20 transition border border-white/10 backdrop-blur"
          onClick={() => navigate("/runs")}
        >
          View All Runs →
        </button>
      </div>
    </div>
  );
}

export default TimelineDemo;
