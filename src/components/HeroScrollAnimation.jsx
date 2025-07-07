import { useScroll } from 'motion/react';
import React, { useRef, useEffect, useState } from 'react';
import Section1 from './Section1';
import Section2 from './Section2';
import Section3 from '../pages/Runs';
import { TimelineDemo } from './Section3';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config.js";

const HeroScrollAnimation = () => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  // Fetch runs from Firebase for footer stats
  const [runs, setRuns] = useState([]);
  useEffect(() => {
    async function fetchRuns() {
      try {
        const snapshot = await getDocs(collection(db, "strava_activities"));
        const allRuns = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          allRuns.push(data);
        });
        setRuns(allRuns);
      } catch {
        setRuns([]);
      }
    }
    fetchRuns();
  }, []);
  const totalDistance = runs.reduce(
    (sum, run) => sum + (typeof run.distance_km === "number" ? run.distance_km : 0),
    0
  );
  const totalRuns = runs.length;

  return (
    <main ref={container} className='relative h-[200vh] bg-black'>
      <Section1 scrollYProgress={scrollYProgress} />
      <Section2 scrollYProgress={scrollYProgress} />
      {/* <Section3/> */}
      <TimelineDemo />
      
      <footer className='bg-black border-t border-white/10'>
        <h1 className='text-[12vw] py-12 leading-[100%] uppercase font-bold text-center text-white tracking-tighter'>
          42.195 km
        </h1>
        <div className='flex flex-col md:flex-row items-center justify-center gap-6 py-4'>
          <span className='text-base md:text-lg text-gray-400 font-semibold'>
            Total Distance: {totalDistance.toFixed(2)} km
          </span>
          <span className='text-base md:text-lg text-gray-400 font-semibold'>
            Number of Runs: {totalRuns}
          </span>
        </div>
        <div className='bg-white text-black h-32 grid place-content-center text-lg uppercase tracking-widest font-semibold'>
          Road to Marathon
        </div>
      </footer>
    </main>
  );
};

export default HeroScrollAnimation;
