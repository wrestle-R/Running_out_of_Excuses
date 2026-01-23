import React, { useState, useEffect } from 'react';
import { useTransform, motion } from 'framer-motion';
import InfiniteGrid from './InfiniteGrid';

const Section2 = ({ scrollYProgress }) => {
	const [isMobile, setIsMobile] = useState(false);
	
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);
	
	const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
	const rotate = useTransform(scrollYProgress, [0, 1], [5, 0]);
	
	const sectionStyle = isMobile ? {} : { scale, rotate };

	return (
		<motion.section
			style={sectionStyle}
			className="relative min-h-[75vh] md:min-h-screen bg-pure-black text-pure-white font-montserrat py-20 flex items-center justify-center overflow-x-hidden"
		>
			<article className='container mx-auto relative z-10 px-8 flex flex-col items-center text-center'>
				<h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-10 text-center">
          CHASING <span className="text-white/80">HORIZONS</span>
        </h2>
				<InfiniteGrid />
			</article>
		</motion.section>
	);
};

export default Section2;
