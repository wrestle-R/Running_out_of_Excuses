import React, { useState } from "react";
import { motion } from "framer-motion";
import MediaItem from "./MediaItem";

const PhoneCardStack = ({ mediaItems, title, description }) => {
  const [topIndex, setTopIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState(null);

  // Generate consistent random values for each card based on its index
  const getCardTransforms = (stackPos, cardIdx) => {
    const seed = cardIdx * 123.456;
    const random1 = (Math.sin(seed) + 1) / 2;
    const random2 = (Math.sin(seed * 1.618) + 1) / 2;
    const random3 = (Math.sin(seed * 2.718) + 1) / 2;

    const isTop = stackPos === 0;

    if (isTop) {
      return {
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        scale: 1,
      };
    }

    const baseRotateZ = (random1 - 0.5) * 16;
    const baseRotateY = (random2 - 0.5) * 12;
    const baseRotateX = -8 - stackPos * 3 - random3 * 4;

    const offsetX = (random1 - 0.5) * 8;
    const offsetY = stackPos * 12 + random2 * 6;

    return {
      x: offsetX,
      y: offsetY,
      rotateX: baseRotateX,
      rotateY: baseRotateY,
      rotateZ: baseRotateZ,
      scale: 1 - stackPos * 0.05,
    };
  };

  const getCardIndex = (i) => (topIndex + i) % mediaItems.length;

  const handleSwipe = (direction) => {
    if (isExiting) return;
    setIsExiting(true);
    setExitDirection(direction);
    setTimeout(() => {
      setTopIndex((prev) => (prev + 1) % mediaItems.length);
      setIsExiting(false);
      setExitDirection(null);
    }, 200);
  };

  const visibleStack = [0, 1, 2, 3];

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div className="w-full max-w-xs flex flex-col items-center mb-24">
        <h1 className="text-xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/60">
          {title}
        </h1>
        <p className="text-sm text-white/70 mb-4">{description}</p>
        <div className="relative w-full h-72 flex items-center justify-center">
          {visibleStack.map((stackPos) => {
            const cardIdx = getCardIndex(stackPos);
            const item = mediaItems[cardIdx];
            const isTop = stackPos === 0;
            const z = visibleStack.length - stackPos;
            const transforms = getCardTransforms(stackPos, cardIdx);

            return (
              <motion.div
                key={item.id + "-" + stackPos + "-" + topIndex}
                className="absolute w-full h-full"
                style={{
                  zIndex: z,
                  pointerEvents: isTop ? "auto" : "none",
                  transformOrigin: "center center",
                  perspective: 1000,
                }}
                initial={false}
                animate={
                  isExiting && isTop
                    ? exitDirection === "left"
                      ? "exitLeft"
                      : "exitRight"
                    : {
                        x: transforms.x,
                        y: transforms.y,
                        rotateX: transforms.rotateX,
                        rotateY: transforms.rotateY,
                        rotateZ: transforms.rotateZ,
                        scale: transforms.scale,
                        opacity: 1,
                      }
                }
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8,
                }}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                dragMomentum={false}
                whileDrag={
                  isTop
                    ? {
                        rotateZ: 0,
                        rotateY: 0,
                        scale: 1.05,
                        transition: { duration: 0.1 },
                      }
                    : {}
                }
                onDragEnd={(_, info) => {
                  if (!isTop) return;
                  const swipeThreshold = 80;
                  const velocityThreshold = 300;
                  const shouldSwipe =
                    Math.abs(info.offset.x) > swipeThreshold ||
                    Math.abs(info.velocity.x) > velocityThreshold;
                  if (shouldSwipe) {
                    handleSwipe(info.offset.x > 0 ? "right" : "left");
                  }
                }}
                variants={{
                  exitLeft: {
                    x: -400,
                    y: 100,
                    rotateZ: -45,
                    rotateY: -20,
                    rotateX: -15,
                    scale: 0.8,
                    opacity: 0,
                    transition: {
                      duration: 0.4,
                      ease: [0.4, 0.0, 0.2, 1],
                      type: "tween",
                    },
                  },
                  exitRight: {
                    x: 400,
                    y: 100,
                    rotateZ: 45,
                    rotateY: 20,
                    rotateX: -15,
                    scale: 0.8,
                    opacity: 0,
                    transition: {
                      duration: 0.4,
                      ease: [0.4, 0.0, 0.2, 1],
                      type: "tween",
                    },
                  },
                }}
              >
                <div className="rounded-xl overflow-hidden shadow-lg bg-muted w-full h-full flex flex-col">
                  <MediaItem item={item} className="w-full h-48 object-cover" />
                  <div className="flex-1 flex flex-col justify-end p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <h3 className="text-white text-base font-semibold line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-white/80 text-xs mt-1 line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PhoneCardStack;
