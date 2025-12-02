import React, { useEffect, useRef, useState } from "react";
import {
  useMotionValueEvent,
  useScroll,
  useTransform,
  motion,
} from "framer-motion";

export const Timeline = ({ data }) => {
  const ref = useRef(null);
  const containerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref, data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  // Only animate the tracking line up to the last timeline item (ball)
  // The last ball should always be "lit" and the line should not go past it.
  // We'll calculate the height up to the last item.
  const lastBallRef = useRef(null);
  const [lastBallOffset, setLastBallOffset] = useState(0);

  useEffect(() => {
    if (lastBallRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const lastBallRect = lastBallRef.current.getBoundingClientRect();
      setLastBallOffset(
        lastBallRect.top + lastBallRect.height / 2 - containerRect.top
      );
    }
  }, [data, (mayBeRerender) => mayBeRerender]); // force recalc on data change

  // The tracking line should not exceed lastBallOffset
  const heightTransform = useTransform(
    scrollYProgress,
    [0, 1],
    [0, lastBallOffset || height]
  );
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full min-h-screen bg-pure-black font-sans md:px-10"
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto text-center px-4 md:px-8 lg:px-10 align-center">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-10 text-center">
          MAH <span className="text-white/80">TIMELINE</span>
        </h2>
        
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            <div
              className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full"
              ref={index === data.length - 1 ? lastBallRef : undefined}
            >
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-pure-black flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-neutral-800 border border-neutral-700 p-2" />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-gray-400">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-gray-400">
                {item.title}
              </h3>
              <div className="text-pure-white">{item.content}</div>
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-700 to-transparent to-[99%]  [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] "
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0  w-[2px] bg-gradient-to-t from-purple-500 via-blue-500 to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
