import React, { useEffect, useState } from "react";
import { Timeline } from "../components/timeline-ui";

// Only show the 3 longest runs from May and 3 from June, display images for both
export function TimelineDemo() {
  const [runs, setRuns] = useState([]);

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
        // Sort and keep top 3 for each month
        const mayTop = byMonth.May.sort((a, b) => b.distance_km - a.distance_km).slice(0, 3);
        const juneTop = byMonth.June.sort((a, b) => b.distance_km - a.distance_km).slice(0, 3);
        setRuns({ May: mayTop, June: juneTop });
      })
      .catch(() => setRuns({ May: [], June: [] }));
  }, []);

  // Wait for runs to load
  if (!runs.May || !runs.June) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  const mayImages = ["/1.jpg", "/2.jpg", "/3.jpg"];
  const juneImages = ["/4.jpg", "/5.jpg", "/6.jpg"];

  // Add a description for each month
  const monthDescriptions = {
    "May 2025": "The beginning of the journey. First steps, new motivation, and the excitement of starting out.",
    "June 2025": "Building consistency and pushing limits. Longer runs, new records, and memorable moments.",
  };

  const data = [
    {
      title: (
        <div>
          <div className="text-2xl font-bold">May 2025</div>
          <div className="text-sm text-gray-400 mb-2">{monthDescriptions["May 2025"]}</div>
        </div>
      ),
      content: (
        <div>
          {runs.May.length ? (
            <ul className="mb-4">
              {runs.May.map((run, idx) => (
                <li key={idx} className="mb-2">
                  <span className="font-bold">{run.date}:</span>{" "}
                  <span>{run.distance_km} km</span>
                  {run.description && (
                    <span className="ml-2 text-gray-500 italic">
                      {run.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400 italic mb-4">No runs this month.</div>
          )}
          <div className="flex flex-row mt-4 gap-4">
            {mayImages.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt={`Run May ${idx + 1}`}
                className="rounded-lg h-48 w-auto"
                style={{ objectFit: "contain", maxWidth: "33.33%" }}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: (
        <div>
          <div className="text-2xl font-bold">June 2025</div>
          <div className="text-sm text-gray-400 mb-2">{monthDescriptions["June 2025"]}</div>
        </div>
      ),
      content: (
        <div>
          {runs.June.length ? (
            <ul className="mb-4">
              {runs.June.map((run, idx) => (
                <li key={idx} className="mb-2">
                  <span className="font-bold">{run.date}:</span>{" "}
                  <span>{run.distance_km} km</span>
                  {run.description && (
                    <span className="ml-2 text-gray-500 italic">
                      {run.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400 italic mb-4">No runs this month.</div>
          )}
          <div className="flex flex-row mt-4 gap-4">
            {juneImages.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt={`Run June ${idx + 1}`}
                className="rounded-lg h-48 w-auto"
                style={{ objectFit: "contain", maxWidth: "33.33%" }}
              />
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="absolute top-0 left-0 w-full">
        <Timeline data={data} />
      </div>
    </div>
  );
}
