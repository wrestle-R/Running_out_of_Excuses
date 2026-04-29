"use client";
import { useScroll } from 'framer-motion';
import React, { useRef, useEffect, useState } from 'react';
import Section1 from './Section1';
import Section2 from './Section2';
import { TimelineDemo } from './Section3';
import { fetchRunsPage } from "@/lib/api";

const HeroScrollAnimation = () => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  // Fetch lightweight footer stats without downloading every run and split.
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  useEffect(() => {
    async function loadFooterStats() {
      try {
        const page = await fetchRunsPage({ limit: 1 });
        setTotalDistance(page.totalDistanceKm);
        setTotalRuns(page.totalRuns);
      } catch {
        setTotalDistance(0);
        setTotalRuns(0);
      }
    }
    loadFooterStats();
  }, []);

  return (
    <main ref={container} className='relative h-[200vh] bg-pure-black'>
      <Section1 scrollYProgress={scrollYProgress} />
      <Section2 scrollYProgress={scrollYProgress} />
      {/* <Section3/> */}
      <TimelineDemo />
      
      <footer className='bg-pure-black border-t border-white/10'>
        <h1 className='text-[12vw] py-12 leading-[100%] uppercase font-bold text-center text-pure-white tracking-tighter'>
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
