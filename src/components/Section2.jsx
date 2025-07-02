import React, { useState, useEffect } from 'react';
import { useTransform, motion } from 'framer-motion';
import InteractiveBentoGallery from './InteractiveBentoGallery';

// Add runningImages array for the gallery
const runningImages = [
	{
		id: 1,
		type: 'image',
		title: 'Morning Run',
		desc: 'Sunrise jog in the park.',
		url: '/1.jpg',
		span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2',
	},
	{
		id: 2,
		type: 'image',
		title: 'Trail Adventure',
		desc: 'Exploring new trails.',
		url: '/2.jpg',
		span:
			'md:col-span-2 md:row-span-2 col-span-1 sm:col-span-2 sm:row-span-2',
	},
	{
		id: 3,
		type: 'image',
		title: 'City Marathon',
		desc: 'Crossing the finish line.',
		url: '/3.jpg',
		span: 'md:col-span-1 md:row-span-3 sm:col-span-2 sm:row-span-2 ',
	},
	{
		id: 4,
		type: 'image',
		title: 'Training Day',
		desc: 'Speedwork at the track.',
		url: '/4.jpg',
		span: 'md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2 ',
	},
	{
		id: 5,
		type: 'image',
		title: 'Long Run',
		desc: 'Endurance building.',
		url: '/5.jpg',
		span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2 ',
	},
	{
		id: 6,
		type: 'image',
		title: 'Group Run',
		desc: 'Running with friends.',
		url: '/6.jpg',
		span: 'md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2 ',
	},
	{
		id: 7,
		type: 'image',
		title: 'Recovery',
		desc: 'Stretching after a run.',
		url: '/7.jpg',
		span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2 ',
	},
	{
		id: 8,
		type: 'image',
		title: 'Mountain Trail',
		desc: 'Conquering steep paths.',
		url: '/8.jpg',
		span: 'md:col-span-2 md:row-span-2 sm:col-span-2 sm:row-span-2 ',
	},
	{
		id: 9,
		type: 'image',
		title: 'Victory Moment',
		desc: 'Personal best achieved.',
		url: '/9.jpg',
		span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2 ',
	},
];

const Section2 = ({ scrollYProgress }) => {
	const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
	const rotate = useTransform(scrollYProgress, [0, 1], [5, 0]);

	return (
		<motion.section
			style={{ scale, rotate }}
			className='relative min-h-screen bg-black text-white font-montserrat pb-20'
		>
			<div className='mb-96 absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]'></div>
			<article className='container mx-auto relative z-10 px-8'>
				<h1 className='text-4xl md:text-6xl leading-[100%] py-8 md:py-16 font-bold tracking-tighter uppercase font-montserrat'>
					Every step <br /> Counts
				</h1>
				<InteractiveBentoGallery
					mediaItems={runningImages}
				/>
			</article>
		</motion.section>
	);
};

export default Section2;
