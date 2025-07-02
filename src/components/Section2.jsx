import React, { useState, useEffect } from 'react';
import { useTransform, motion } from 'framer-motion';
import InfiniteGrid from './InfiniteGrid';

const Section2 = ({ scrollYProgress }) => {
	const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
	const rotate = useTransform(scrollYProgress, [0, 1], [5, 0]);

	return (
		<motion.section
			style={{ scale, rotate }}
			className='relative min-h-screen bg-black text-white font-montserrat pb-20'
		>
			<article className='container mx-auto relative z-10 px-8'>
				<h1 className='text-4xl md:text-6xl leading-[100%] py-8 md:py-16 font-bold tracking-tighter uppercase font-montserrat'>
					Every step <br /> Counts
				</h1>
				<InfiniteGrid />
			</article>
		</motion.section>
	);
};

export default Section2;
		