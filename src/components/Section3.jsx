import React, { useEffect, useState } from "react";
import { Timeline } from "./timeline-ui";
import { useNavigate } from "react-router-dom";

// Only show the 3 longest runs from May and 3 from June, display images for both
export function TimelineDemo() {
  const [runs, setRuns] = useState({ May: [], June: [] });
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/run.json")
      .then((res) => res.json())
      .then((data) => {
        // Group runs by month
        const byMonth = { May: [], June: [] };
        data.forEach((run) => {
          const date = new Date(run.date);
          const month = date.toLocaleString("default", { month: "long" });
          if (month === "May") byMonth.May.push(run);
          if (month === "June") byMonth.June.push(run);
        });
        // Sort and keep top 3 for each month for display, but keep all for stats
        setRuns({
          May: {
            all: byMonth.May,
            top: byMonth.May.slice().sort((a, b) => b.distance_km - a.distance_km).slice(0, 3),
          },
          June: {
            all: byMonth.June,
            top: byMonth.June.slice().sort((a, b) => b.distance_km - a.distance_km).slice(0, 3),
          },
        });
      })
      .catch(() => setRuns({
        May: { all: [], top: [] },
        June: { all: [], top: [] },
      }));
  }, []);

  // Wait for runs to load
  const mayReady = runs.May && Array.isArray(runs.May.all) && Array.isArray(runs.May.top);
  const juneReady = runs.June && Array.isArray(runs.June.all) && Array.isArray(runs.June.top);

  if (!mayReady || !juneReady) {
    return (
      <div className="w-full flex items-center justify-center text-gray-400 py-12">
        Loading...
      </div>
    );
  }

  const mayImages = ["/1.jpg", "/2.jpg", "/3.jpg"];
  const juneImages = ["/4.jpg", "/5.jpg", "/6.jpg"];

  // Add a description for each month
  const monthDescriptions = {
    "May 2025": "Just Started Running, love seeing new places and feeling of accomplishment just after I finish a run",
    "June 2025": "Started Running a little more, really started enjoying for the first time",
  };

  // Calculate stats for each month
  const mayTotalRuns = (runs.May.all || []).length;
  const mayTotalDistance = (runs.May.all || []).reduce((sum, run) => sum + (typeof run.distance_km === "number" ? run.distance_km : 0), 0);
  const juneTotalRuns = (runs.June.all || []).length;
  const juneTotalDistance = (runs.June.all || []).reduce((sum, run) => sum + (typeof run.distance_km === "number" ? run.distance_km : 0), 0);

  const data = [
    {
      title: (
        <div className="flex flex-col gap-1">
          <div className="text-4xl md:text-5xl pb-8 font-bold text-white tracking-tight">
            May 2025
          </div>
          <div className="text-sm md:text-base text-gray-300 mb-1 font-medium italic">
            {monthDescriptions["May 2025"]}
          </div>
          <div className="inline-flex w-[60%] gap-3 text-xs md:text-sm text-gray-400 font-semibold mb-1 bg-white/5 rounded-lg px-4 py-2 shadow-inner">
            <span>
              <span className="text-white font-bold">{mayTotalRuns}</span> runs
            </span>
            <span className="opacity-60">|</span>
            <span>
              <span className="text-white font-bold">{mayTotalDistance.toFixed(2)}</span> km
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            <span className="font-bold text-white">Challenge:</span> I had a hairline fracture on my left foot, so I had to slow down.
          </div>
        </div>
      ),
      content: (
        <div>
          {/* Removed top 3 runs list */}
          <div className="flex flex-row mt-4 gap-4 justify-center">
            {mayImages.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt={`Run May ${idx + 1}`}
                className="rounded-xl h-40 md:h-48 w-auto shadow-lg border-2 border-white/10 hover:scale-105 transition"
                style={{ objectFit: "contain", height: "15rem" }}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: (
        <div className="flex flex-col gap-1">
          <div className="text-4xl md:text-5xl pb-8 font-bold text-white tracking-tight">
            June 2025
          </div>
          <div className="text-sm md:text-base text-gray-300 mb-1 font-medium italic">
            {monthDescriptions["June 2025"]}
          </div>
          <div className="inline-flex w-[60%] gap-3 text-xs md:text-sm text-gray-400 font-semibold mb-1 bg-white/5 rounded-lg px-4 py-2 shadow-inner">
            <span>
              <span className="text-white font-bold">{juneTotalRuns}</span> runs
            </span>
            <span className="opacity-60">|</span>
            <span>
              <span className="text-white font-bold">{juneTotalDistance.toFixed(2)}</span> km
            </span>
          </div>
          <div className="text-xs text-gray-400 italic mt-1">
            <span className="font-bold text-white">Challenge:</span> I was in my gav so couldn't run and fell sick every second week.
          </div>
        </div>
      ),
      content: (
        <div>
          {/* Removed top 3 runs list */}
          <div className="flex flex-row mt-4 gap-4 justify-center">
            {juneImages.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt={`Run June ${idx + 1}`}
                className="rounded-xl h-40 md:h-48 w-auto shadow-lg border-2 border-white/10 hover:scale-105 transition"
                style={{ objectFit: "contain", height: "15rem" }}
              />
            ))}
          </div>
        </div>
      ),
    },
    
  ];

  return (
    <div className="w-full bg-gradient-to-b from-black via-zinc-950 to-black py-12 px-2 md:px-8 font-montserrat">
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center">
        <Timeline data={data} />
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
