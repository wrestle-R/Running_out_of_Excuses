import { useScroll } from 'motion/react';
import React, { useRef } from 'react';
import Section1 from './Section1';
import Section2 from './Section2';

const HeroScrollAnimation = () => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  return (
    <main ref={container} className='relative h-[200vh] bg-black'>
      <Section1 scrollYProgress={scrollYProgress} />
      <Section2 scrollYProgress={scrollYProgress} />
      
      <footer className='bg-black border-t border-white/10'>
        <h1 className='text-[12vw] py-12 leading-[100%] uppercase font-bold text-center text-white tracking-tighter'>
          42.195 km
        </h1>
        <div className='bg-white text-black h-32 grid place-content-center text-lg uppercase tracking-widest font-semibold'>
          Road to Marathon
        </div>
      </footer>
    </main>
  );
};

export default HeroScrollAnimation;
      