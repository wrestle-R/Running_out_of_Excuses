"use client";
import { useRunnyPhotos, photoDisplayUrl } from "@/lib/runny-photos";
import React, { useState } from 'react';
import {
  GridBody,
  DraggableContainer,
  GridItem,
} from "@/components/ui/infinite-drag-scroll";



const InfiniteGrid = () => {
  const photos = useRunnyPhotos();
  const runningImages = React.useMemo(() => photos.filter(p => p.placement === "gallery").map(p => ({ id: p.id, src: p.url, alt: p.alt, desc: p.caption })), [photos]);
  const [hoveredId, setHoveredId] = useState(null);

  const handleMouseEnter = (id) => {
    setHoveredId(id);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
  };

  // Create a randomized image set where neighbors are guaranteed to be different
  const createDiverseSet = () => {
    const result = [];
    // Only use the images that are not commented out and valid
    // Filtering any potential nulls or unassigned IDs
    const validImages = runningImages.filter(img => img && img.src);
    
    // We want to generate ~60 images for sufficient scrolling
    const totalSlots = validImages.length ? Math.max(60, validImages.length) : 0;
    const unused = new Set(validImages.map(image => image.id));
    
    // We'll fill the slots one by one, picking an image that doesn't conflict
    // with neighbors:
    // - Left neighbor: index - 1
    // - Top neighbor (2-col layout): index - 2
    // - Top-Top neighbor (2-col layout): index - 4
    // - Top neighbor (6-col layout): index - 6
    // - Top-Top neighbor (6-col layout): index - 12
    
    for (let i = 0; i < totalSlots; i++) {
      // Find constraints (image IDs to avoid)
      const avoidIds = new Set();
      
      const checkAndAdd = (idx) => {
        if (idx >= 0 && result[idx]) {
          avoidIds.add(result[idx].originalId);
        }
      };

      checkAndAdd(i - 1);  // Left
      checkAndAdd(i - 2);  // 2-col top
      checkAndAdd(i - 4);  // 2-col top-top (user complaint: 1st and 3rd row same)
      checkAndAdd(i - 6);  // 6-col top
      checkAndAdd(i - 12); // 6-col top-top

      // Filter available candidates
      let candidates = validImages.filter(img => !avoidIds.has(img.id));
      
      // If we somehow constrained all images (unlikely with 12 images vs 5 constraints),
      // fallback to any image (or maybe just exclude the immediate top/left)
      if (candidates.length === 0) {
        candidates = validImages;
      }
      
      // Include every saved photo before repeating the gallery, including new uploads.
      if (unused.size) {
        const fresh = candidates.filter(image => unused.has(image.id));
        candidates = fresh.length ? fresh : validImages.filter(image => unused.has(image.id));
      }

      // Pick a random candidate
      // Use a consistent seeded-like randomness to avoid hydration mismatches if possible, 
      // but simple math random is fine for client-side only. 
      // Using a simple pseudo-random based on index to be deterministic.
      const seed = (i * 9301 + 49297) % 233280;
      const choiceIndex = Math.floor((seed / 233280) * candidates.length);
      const choice = candidates[choiceIndex];
      unused.delete(choice.id);
      
      result.push({
        ...choice,
        id: i * 100, // Unique ID for key
        originalId: choice.id
      });
    }
    
    return result;
  };

  // Use useMemo ensures we don't regenerate on every render
  const extendedImages = React.useMemo(() => createDiverseSet(), [runningImages]);

  return (
    <DraggableContainer variant="masonry">
      <GridBody>
        {extendedImages.map((image) => (
          <GridItem
            key={image.id}
            className={`relative h-44 w-32 md:h-80 md:w-56 transition-all duration-500 ease-out
              ${hoveredId !== null && hoveredId !== image.originalId ? "blur-[2px] brightness-50 scale-95" : ""}
              ${hoveredId === image.originalId ? "scale-110 z-30" : ""}
            `}
            onMouseEnter={() => handleMouseEnter(image.originalId)}
            onMouseLeave={handleMouseLeave}
            tabIndex={0}
            onFocus={() => handleMouseEnter(image.originalId)}
            onBlur={handleMouseLeave}
          >
            <img
              src={photoDisplayUrl(image.src)}
              alt={image.alt}
              className="pointer-events-none absolute h-full w-full object-cover rounded"
              draggable={false}
            />
            {hoveredId === image.originalId && (
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-transparent to-transparent rounded transition-all duration-300">
                <span className="text-pure-white text-sm md:text-base font-medium p-3 md:p-4 text-center w-full">
                  {image.desc}
                </span>
              </div>
            )}
          </GridItem>
        ))}
      </GridBody>
    </DraggableContainer>
  );
};

export default InfiniteGrid;
