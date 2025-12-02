import React, { useState, useEffect } from "react";
import { Footprints } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.config.js';
import runnyBlack from "/runny-black-nobg.png";
import runnyWhite from "/runny-white-nobg.png";

// Improved CardCurtainReveal components
const CardCurtainReveal = ({ children, className }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-lg transform transition-all duration-300 ${
        isHovered ? "scale-[1.03] shadow-xl z-10" : ""
      } ${className}`}
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
      className={`transition-all duration-300 ease-in-out ${
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
      className={`absolute inset-0 transition-all duration-300 ease-in-out transform ${
        isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </div>
  );
};

function paceToSpeed(pace) {
  // Handle both formats: "5.5" and "5:30/km"
  if (typeof pace === 'string' && pace.includes(':')) {
    const [min, rest] = pace.split(":");
    const [sec] = rest.split("/");
    const totalMin = parseInt(min, 10) + parseInt(sec, 10) / 60;
    if (!totalMin) return 0;
    return +(60 / totalMin).toFixed(2);
  }
  // Handle decimal format
  const paceNum = parseFloat(pace);
  return paceNum ? +(60 / paceNum).toFixed(2) : 0;
}

function isWalk(pace) {
  // Handle both formats: "5.5" and "5:30/km"
  if (typeof pace === 'string' && pace.includes(':')) {
    const [min, rest] = pace.split(":");
    const [sec] = rest.split("/");
    const totalSec = parseInt(min, 10) * 60 + parseInt(sec, 10);
    return totalSec >= 600; // 10:00/km or slower
  }
  // Handle decimal format
  const paceNum = parseFloat(pace);
  return paceNum >= 10; // 10 min/km or slower
}

function formatPace(pace) {
  if (typeof pace === 'string' && pace.includes(':')) {
    return pace;
  }
  const paceNum = parseFloat(pace);
  if (!paceNum) return 'N/A';
  const minutes = Math.floor(paceNum);
  const seconds = Math.round((paceNum - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function formatTime(minutes) {
  const mins = Math.floor(parseFloat(minutes));
  const secs = Math.round((parseFloat(minutes) - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSplitPace(pace) {
  const paceNum = parseFloat(pace);
  if (!paceNum) return 'N/A';
  const minutes = Math.floor(paceNum);
  const seconds = Math.round((paceNum - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDateToDDMMYYYY(dateStr) {
  if (!dateStr) return dateStr;
  const [mm, dd, yyyy] = dateStr.split('/').map(Number);
  return `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yyyy}`;
}

const loadActivitiesFromFirebase = async () => {
  try {
    const q = query(collection(db, 'strava_activities'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const firebaseActivities = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      firebaseActivities.push({ firebaseId: doc.id, ...data, date: formatDateToDDMMYYYY(data.date) });
    });
    // Sort by dd-mm-yyyy descending
    firebaseActivities.sort((a, b) => {
      const parseDate = (str) => {
        if (!str) return 0;
        const [dd, mm, yyyy] = str.split('-').map(Number);
        return new Date(yyyy, mm - 1, dd).getTime();
      };
      return parseDate(b.date) - parseDate(a.date);
    });
    return firebaseActivities;
  } catch (error) {
    console.error('Error loading from Firebase:', error);
    return [];
  }
};

export default function Section3() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading activities from Firebase...');
        const firebaseData = await loadActivitiesFromFirebase();
        setRuns(firebaseData);
        console.log(`Loaded ${firebaseData.length} activities from Firebase`);

      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load activities from Firebase');
        setRuns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Calculate total distance
  const totalDistance = runs.reduce(
    (sum, run) => sum + (typeof run.distance_km === "number" ? run.distance_km : 0),
    0
  );
  const totalRuns = runs.length;

  return (
    <section className="py-16 px-4 md:px-8 bg-pure-black text-pure-white font-montserrat min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div className="flex gap-4 mb-6 md:mb-0">
            <button
              className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all duration-200 border border-white/10 backdrop-blur-sm flex items-center gap-2"
              onClick={() => navigate("/")}
            >
              <span>←</span> Back to Home
            </button>
            

          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex gap-3 text-sm text-white/60">
              <span>Total Runs: <span className="font-bold text-white">{totalRuns}</span></span>
              <span>·</span>
              <span>Total Distance: <span className="font-bold text-white">{totalDistance.toFixed(1)} km</span></span>
            </div>
          </div>
        </div>
        
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-10 text-center">
          Every Step <span className="text-pure-white/80">Counts</span>
        </h2>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 min-h-[300px]">
            <svg className="animate-spin h-12 w-12 text-pure-white mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <p className="text-lg text-pure-white/80 font-semibold">Loading your activities...</p>
            <p className="text-sm text-pure-white/40 mt-2">Fetching from Firebase storage.</p>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-lg text-center text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-12">
            <p className="font-bold mb-2 text-xl">Unable to load activities</p>
            <p className="text-base opacity-80">{error}</p>
            <button
              className="mt-4 px-4 py-2 rounded bg-red-600 text-pure-white font-semibold hover:bg-red-700 transition"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && runs.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-xl text-pure-white/60">No activities found in Firebase.</p>
            <button
              className="mt-4 px-6 py-2 rounded-full bg-blue-600 text-pure-white font-semibold hover:bg-blue-700 transition"
              onClick={() => navigate("/refresh")}
            >
              Load Data from Strava
            </button>
          </div>
        )}
        
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {runs.map((run, idx) => {
            const speed = paceToSpeed(run.pace);
            const walk = isWalk(run.pace);
            const desc = run.description && run.description.trim().length > 0 ? run.description : null;
            const hasSplits = run.splits && run.splits.length > 0;
            const splitCount = hasSplits ? run.splits.length : 0;
            
            return (
              <CardCurtainReveal
                key={run.firebaseId || idx}
                className="cursor-pointer bg-gradient-to-br from-white to-gray-100 border border-pure-white/10"
              >
                <CardCurtainRevealBody className="pt-5 px-8 flex flex-col h-[260px] overflow-x-hidden w-full max-w-full">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex-shrink-0" style={{ marginTop: '-14px' }}>
                      {walk ? (
                        <Footprints size={36} className="text-gray-800" />
                      ) : (
                        <img
                          src={runnyBlack}
                          alt="Run"
                          style={{ width: 60, height: 60, objectFit: "contain" }}
                          className="opacity-90"
                        />
                      )}
                    </div>
                    <span className="text-base font-semibold text-gray-500 truncate max-w-[120px] text-right">{run.date}</span>
                  </div>
                  
                  <div className="flex flex-col flex-grow pb-10 justify-center items-center w-full">
                    <h3 className="text-gray-700  text-2xl font-extrabold mb-3 text-center w-full max-w-full tracking-tight break-words whitespace-normal">
                      {run.name || 'Run'}
                    </h3>
                    <div className="flex items-end gap-2 justify-center w-full">
                      <span className="text-6xl font-extrabold text-pure-black leading-none drop-shadow-sm">{run.distance_km}</span>
                      <span className="text-gray-500 font-semibold text-2xl mb-1">km</span>
                    </div>
                  </div>
                </CardCurtainRevealBody>
                
                <CardCurtainRevealDescription className="bg-pure-black text-pure-white p-6 overflow-auto custom-scrollbar w-full max-w-full">
                  <div className="flex items-center justify-between mb-5 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      {walk ? (
                        <Footprints size={20} className="text-white/90" />
                      ) : (
                        <img
                          src={runnyWhite}
                          alt="Run"
                          style={{ width: 22, height: 22, objectFit: "contain" }}
                        />
                      )}
                        <span className="font-bold truncate text-lg max-w-[140px]">{run.name || 'Run'}</span>
                    </div>
                    <span className="text-xs text-pure-white/60 font-medium truncate max-w-[90px] text-right">{run.date}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6 w-full">
                    <div>
                      <div className="text-pure-white/50 text-xs uppercase mb-1">Distance</div>
                      <div className="text-xl font-bold">{run.distance_km} km</div>
                    </div>
                    <div>
                      <div className="text-pure-white/50 text-xs uppercase mb-1">Pace</div>
                      <div className="text-xl font-bold">{run.pace}</div>
                    </div>
                    <div>
                      <div className="text-pure-white/50 text-xs uppercase mb-1">Time</div>
                      <div className="text-xl font-bold">{formatTime(run.elapsed_time_min)}</div>
                    </div>
                  </div>
                  
                  {hasSplits && (
                    <div className="mb-6 w-full">
                      <div className="flex justify-between items-center mb-3 w-full">
                        <div className="text-pure-white/50 text-xs uppercase">Kilometer Splits</div>
                        <div className="text-xs text-pure-white/40 font-medium">{splitCount} splits</div>
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        {run.splits.map((split, i) => (
                          <div
                            key={i}
                            className={`flex justify-between items-center px-3 py-1.5 rounded-md text-sm ${
                              i % 2 === 0 ? 'bg-white/10' : 'bg-white/5'
                            } w-full`}
                          >
                            <span className="font-medium">KM {split.km}</span>
                            <span className="font-bold">{formatSplitPace(split.pace_min_per_km)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {desc && desc !== "No description 😶" && (
                    <div className="mt-4 border-t border-pure-white/10 pt-4 w-full">
                      <div className="text-pure-white/50 text-xs uppercase mb-1">Notes</div>
                      <div className="text-sm leading-relaxed text-pure-white/80 break-words">{desc}</div>
                    </div>
                  )}
                </CardCurtainRevealDescription>
              </CardCurtainReveal>
            );
          })}
        </div>
      </div>
      
      {/* Strava badge and custom HTML at bottom */}
      <div className="max-w-7xl mx-auto mt-16 flex flex-col items-center gap-4 pb-8">
        <span
          dangerouslySetInnerHTML={{
            __html: `
<a style="display:inline-block;background-color:#FC5200;color:#fff;padding:5px 10px 5px 30px;font-size:11px;font-family:Helvetica, Arial, sans-serif;white-space:nowrap;text-decoration:none;background-repeat:no-repeat;background-position:10px center;border-radius:3px;background-image:url('https://badges.strava.com/logo-strava-echelon.png')" href='https://strava.com/athletes/159046302' target="_clean">
  Follow me on
  <img src='https://badges.strava.com/logo-strava.png' alt='Strava' style='margin-left:2px;vertical-align:text-bottom' height=13 width=51 />
</a>
            `,
          }}
        />
        
      </div>
      
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.1);
          max-height: 80vh;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </section>
  );
}