import React, { useState, useEffect } from "react";
import { Footprints } from "lucide-react";
import { useNavigate } from "react-router-dom";
import runnyBlack from "/runny-black-nobg.png";
import runnyWhite from "/runny-white-nobg.png";

// Simple CardCurtainReveal components (black and white themed)
const CardCurtainReveal = ({ children, className }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative overflow-hidden cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { isHovered })
      )}
    </div>
  );
};

const CardCurtainRevealBody = ({ children, className, isHovered }) => {
  return (
    <div
      className={`transition-all duration-300 ${
        isHovered ? "opacity-0" : "opacity-100"
      } ${className}`}
    >
      {children}
    </div>
  );
};

const CardCurtainRevealDescription = ({ children, className, isHovered }) => {
  return (
    <div
      className={`transition-all duration-300 ${
        isHovered ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
};

function paceToSpeed(pace) {
  // pace: "min:sec/km" => speed in km/h
  const [min, rest] = pace.split(":");
  const [sec] = rest.split("/"); // remove "/km"
  const totalMin = parseInt(min, 10) + parseInt(sec, 10) / 60;
  if (!totalMin) return 0;
  return +(60 / totalMin).toFixed(2);
}

function isWalk(pace) {
  // pace: "min:sec/km"
  const [min, rest] = pace.split(":");
  const [sec] = rest.split("/"); // remove "/km"
  const totalSec = parseInt(min, 10) * 60 + parseInt(sec, 10);
  return totalSec >= 600; // 10:00/km or slower
}

export default function Section3() {
  const [runs, setRuns] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/run.json")
      .then((res) => res.json())
      .then(setRuns)
      .catch(() => {
        // No fallback data
      });
  }, []);

  // Calculate total distance
  const totalDistance = runs.reduce(
    (sum, run) => sum + (typeof run.distance_km === "number" ? run.distance_km : 0),
    0
  );
  const totalRuns = runs.length;

  return (
    <section className="py-12 pb-8 px-2 md:px-8 bg-black text-white font-montserrat min-h-[60vh] flex flex-col items-center">
      <div className="w-full max-w-7xl flex justify-between items-center mb-8">
        <button
        className="mb-8 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold shadow hover:bg-white/20 transition border border-white/10 backdrop-blur self-start"
        onClick={() => navigate("/")}
      >
        ← Back to Home
      </button>
      </div>
      <h2 className="text-4xl md:text-6xl leading-[100%] pb-24 font-bold tracking-tighter uppercase font-montserrat text-center">
        Every Step Counts
      </h2>
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full max-w-7xl">
        {runs.map((run, idx) => {
          const speed = paceToSpeed(run.pace);
          const walk = isWalk(run.pace);
          const desc =
            run.description && run.description.trim().length > 0
              ? run.description
              : null;
          return (
            <CardCurtainReveal
              key={idx}
              className="rounded-3xl shadow-xl bg-white border-0 hover:scale-105 hover:shadow-2xl transition-all duration-300"
            >
              <CardCurtainRevealBody className="flex flex-col items-center justify-center min-h-[160px] relative">
                <div className="absolute top-4 left-4 text-black">
                  {walk ? (
                    <Footprints size={32} />
                  ) : (
                    <img
                      src={runnyBlack}
                      alt="Run"
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  )}
                </div>
                <div className="font-semibold text-lg text-black mb-1">
                  {run.date}
                </div>
                <div className="font-black text-4xl text-black mb-2">
                  {run.distance_km} km
                </div>
              </CardCurtainRevealBody>
              <CardCurtainRevealDescription className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white font-semibold text-lg px-4 text-center rounded-3xl">
                <div>
                  {walk ? (
                    <span className="flex items-center gap-2 justify-center mb-2 text-white">
                      <Footprints size={22} /> Walk
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center mb-2 text-white">
                      <img
                        src={runnyWhite}
                        alt="Run"
                        style={{
                          width: 24,
                          height: 24,
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                      Run
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold mb-1 text-white">
                  {run.pace}
                </div>
                {desc && <div className="text-base text-white">{desc}</div>}
              </CardCurtainRevealDescription>
            </CardCurtainReveal>
          );
        })}
      </div>
    </section>
  );
}
