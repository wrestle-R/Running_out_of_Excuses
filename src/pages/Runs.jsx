import React, { useState, useEffect } from "react";
import { Footprints } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, setDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.config.js';
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

const saveActivitiesToFirebase = async (activities) => {
  try {
    const promises = activities.map(async (activity, index) => {
      const activityId = `activity_${new Date(activity.date).getTime()}_${index}`;
      await setDoc(doc(db, 'strava_activities', activityId), {
        ...activity,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    await Promise.all(promises);
    console.log('✅ Activities saved to Firebase');
  } catch (error) {
    console.error('Error saving to Firebase:', error);
  }
};

const loadActivitiesFromFirebase = async () => {
  try {
    const q = query(collection(db, 'strava_activities'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const firebaseActivities = [];
    querySnapshot.forEach((doc) => {
      firebaseActivities.push(doc.data());
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
  const [dataSource, setDataSource] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching from backend...');
        
        // Try to fetch from backend first
        const res = await fetch('http://localhost:3000/api/activities', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Backend response status:', res.status);
        
        if (res.status === 401) {
          // On 401, load from Firebase
          console.log('API rate limited, loading from Firebase...');
          setDataSource('Firebase (API rate limited)');
          const firebaseData = await loadActivitiesFromFirebase();
          setRuns(firebaseData);
          return;
        }
        
        if (!res.ok) {
          throw new Error(`Backend API Error: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Backend data received:', data.length, 'activities');
        
        // Transform data to match expected format
        const transformedData = data.map(activity => ({
          name: activity.name,
          date: activity.date,
          distance_km: parseFloat(activity.distance_km),
          pace: formatPace(activity.pace_min_per_km),
          description: activity.description || 'No description',
          elapsed_time_min: activity.elapsed_time_min,
          splits: activity.splits || []
        }));
        
        setRuns(transformedData);
        setDataSource('Strava API');
        
        // Save fresh data to Firebase for future use
        await saveActivitiesToFirebase(transformedData);
        
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        
        // Fallback to Firebase on any error
        console.log('Error occurred, loading from Firebase...');
        setDataSource('Firebase (fallback)');
        const firebaseData = await loadActivitiesFromFirebase();
        setRuns(firebaseData);
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
    <section className="py-12 pb-8 px-2 md:px-8 bg-black text-white font-montserrat min-h-[60vh] flex flex-col items-center">
      <div className="w-full max-w-7xl flex justify-between items-center mb-8">
        <button
          className="mb-8 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold shadow hover:bg-white/20 transition border border-white/10 backdrop-blur self-start"
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </button>
      </div>
      
      <h2 className="text-4xl md:text-6xl leading-[100%] pb-8 font-bold tracking-tighter uppercase font-montserrat text-center">
        Every Step Counts
      </h2>
      
      {dataSource && (
        <p className="text-white/60 text-sm mb-8 text-center">
          Data source: {dataSource}
        </p>
      )}
      
      {loading && (
        <div className="text-center text-lg text-white/80 mb-8">
          Loading activities...
        </div>
      )}
      
      {error && !loading && runs.length === 0 && (
        <div className="text-center text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-8">
          {error}
        </div>
      )}
      
      {!loading && runs.length === 0 && (
        <div className="text-center text-white/60 mb-8">
          No activities found.
        </div>
      )}
      
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full max-w-7xl">
        {runs.map((run, idx) => {
          const speed = paceToSpeed(run.pace);
          const walk = isWalk(run.pace);
          const desc = run.description && run.description.trim().length > 0 ? run.description : null;
          
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
                        width: 50,
                        height: 50,
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
                      {run.name || 'Run'}
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
