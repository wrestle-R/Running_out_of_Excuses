"use client";
import { useRunnyPhotos, photoDisplayUrl } from "@/lib/runny-photos";
import React, { useEffect, useState } from "react";
import { arrangeGallery } from "@/lib/gallery-layout";
import {
  GridBody,
  DraggableContainer,
  GridItem,
} from "@/components/ui/infinite-drag-scroll";


const InfiniteGrid = () => {
  const photos = useRunnyPhotos();
  const runningImages = React.useMemo(() => photos.filter(p => p.placement === "gallery").map(p => ({ id: p.id, src: p.url, alt: p.alt, desc: p.caption })), [photos]);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Start with the same server/client layout, then shuffle once after hydration.
  // Keeping this seed for the visit prevents polling, focus and captions from
  // moving the photos around while someone is browsing.
  useEffect(() => {
    setShuffleSeed(crypto.getRandomValues(new Uint32Array(1))[0]);
  }, []);

  const extendedImages = React.useMemo(() => arrangeGallery(runningImages, shuffleSeed), [runningImages, shuffleSeed]);

  return (
    <DraggableContainer variant="masonry">
      <GridBody>
        {extendedImages.map((image) => (
          <GridItem
            key={image.slotId}
            data-gallery-photo={image.id}
            data-gallery-slot={image.slotId}
            className="group relative h-44 w-32 md:h-80 md:w-56 transition-transform duration-300 ease-out hover:z-30 hover:scale-105 focus-visible:z-30 focus-visible:outline-2 focus-visible:outline-white"
            tabIndex={0}
          >
            <img
              src={photoDisplayUrl(image.src)}
              alt={image.alt}
              className="pointer-events-none absolute h-full w-full object-cover rounded"
              draggable={false}
            />
            {image.desc && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center rounded bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
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
