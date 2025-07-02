import { useTransform, motion } from 'motion/react';
import React from 'react';

const Section2 = ({ scrollYProgress }) => {
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [5, 0]);

  return (
    <motion.section
      style={{ scale, rotate }}
      className='relative h-screen bg-black text-white'
    >
      <div className='absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]'></div>
      
      <article className='container mx-auto relative z-10 px-8'>
        <h1 className='text-6xl leading-[100%] py-16 font-bold tracking-tighter uppercase'>
          Every step <br /> Counts
        </h1>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <img
            src='https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop&q=80'
            alt='Running shoes on track'
            className='object-cover w-full h-64 grayscale hover:grayscale-0 transition-all duration-300'
          />
          <img
            src='https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&auto=format&fit=crop&q=80'
            alt='Runner on trail'
            className='object-cover w-full h-64 grayscale hover:grayscale-0 transition-all duration-300'
          />
          <img
            src='https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&auto=format&fit=crop&q=80'
            alt='Marathon finish line'
            className='object-cover w-full h-64 grayscale hover:grayscale-0 transition-all duration-300'
          />
          <img
            src='https://images.unsplash.com/photo-1486218119243-13883505764c?w=400&auto=format&fit=crop&q=80'
            alt='Early morning run'
            className='object-cover w-full h-64 grayscale hover:grayscale-0 transition-all duration-300'
          />
        </div>
      </article>
    </motion.section>
  );
};

export default Section2;
