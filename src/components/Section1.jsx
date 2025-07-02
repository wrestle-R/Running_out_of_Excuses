import { useTransform, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

const TextReveal = ({ text, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const words = text.split(' ');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="overflow-hidden">
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          initial={{ 
            opacity: 0, 
            y: 50,
            filter: 'blur(10px)'
          }}
          animate={isVisible ? { 
            opacity: 1, 
            y: 0,
            filter: 'blur(0px)'
          } : {}}
          transition={{
            duration: 0.8,
            delay: idx * 0.1,
            ease: [0.25, 0.4, 0.25, 1]
          }}
          className="inline-block mr-3"
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
};

const Section1 = ({ scrollYProgress }) => {
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -2]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);
  
  return (
    <motion.section
      style={{ scale, rotate, opacity }}
      className='sticky top-0 h-screen bg-black flex flex-col items-center justify-center text-white overflow-hidden font-montserrat'
    >
      {/* Gradient overlay */}
      <div className='absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60'></div>

      <div className='relative z-10 text-center px-8 max-w-6xl'>


        <div className='2xl:text-8xl xl:text-7xl lg:text-6xl md:text-5xl text-4xl font-black tracking-[-0.02em] leading-[0.9] uppercase'>
          <TextReveal text="RUNNING  OUT" delay={800} />
          <br />
          <TextReveal text="OF  EXCUSES" delay={1200} />
        </div>



      </div>

      {/* Ambient glow effect */}
      <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl'></div>
    </motion.section>
  );
};

export default Section1;