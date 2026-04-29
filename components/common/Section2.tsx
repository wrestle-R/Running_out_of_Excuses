"use client";
import React, { useState, useEffect } from 'react';
import { useReducedMotion, useTransform, motion } from 'framer-motion';
import InfiniteGrid from './InfiniteGrid';

function useDesktopMotion() {
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		const query = window.matchMedia("(min-width: 768px)");
		const update = () => setIsDesktop(query.matches);

		update();
		query.addEventListener("change", update);

		return () => query.removeEventListener("change", update);
	}, []);

	return isDesktop;
}

const Section2 = ({ scrollYProgress }) => {
	const isDesktop = useDesktopMotion();
	const reduceMotion = useReducedMotion();
	
	const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
	const rotate = useTransform(scrollYProgress, [0, 1], [5, 0]);
	
	const sectionStyle = isDesktop && !reduceMotion
		? { scale, rotate, willChange: "transform" }
		: {};

	return (
		<motion.section
			style={sectionStyle}
			className="relative min-h-[85vh] md:min-h-[85vh] bg-pure-black text-pure-white font-montserrat py-20 flex items-center justify-center overflow-x-hidden transform-gpu"
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
