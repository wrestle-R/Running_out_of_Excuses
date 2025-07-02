import React from 'react';
import { 
  GridBody,
  DraggableContainer,
  GridItem, 
} from "./ui/infinite-drag-scroll";

const runningImages = [
  {
    id: 1,
    alt: "Morning Run",
    src: "/1.jpg",
  },
  {
    id: 2,
    alt: "Trail Adventure",
    src: "/2.jpg",
  },
  {
    id: 3,
    alt: "City Marathon",
    src: "/3.jpg",
  },
  {
    id: 4,
    alt: "Training Day",
    src: "/4.jpg",
  },
  {
    id: 5,
    alt: "Long Run",
    src: "/5.jpg",
  },
  {
    id: 6,
    alt: "Group Run",
    src: "/6.jpg",
  },
  {
    id: 7,
    alt: "Recovery",
    src: "/7.jpg",
  },
  {
    id: 8,
    alt: "Mountain Trail",
    src: "/8.jpg",
  },
  {
    id: 9,
    alt: "Victory Moment",
    src: "/9.jpg",
  },
  {
    id: 10,
    alt: "Morning Run 2",
    src: "/1.jpg",
  },
  {
    id: 11,
    alt: "Trail Adventure 2",
    src: "/2.jpg",
  },
  {
    id: 12,
    alt: "City Marathon 2",
    src: "/3.jpg",
  },
  {
    id: 13,
    alt: "Training Day 2",
    src: "/4.jpg",
  },
  {
    id: 14,
    alt: "Long Run 2",
    src: "/5.jpg",
  },
  {
    id: 15,
    alt: "Group Run 2",
    src: "/6.jpg",
  },
  {
    id: 16,
    alt: "Recovery 2",
    src: "/7.jpg",
  },
  {
    id: 17,
    alt: "Mountain Trail 2",
    src: "/8.jpg",
  },
  {
    id: 18,
    alt: "Victory Moment 2",
    src: "/9.jpg",
  },
];

const InfiniteGrid = () => {
  return (
    <DraggableContainer variant="masonry">
      <GridBody>
        {runningImages.map((image) => (
          <GridItem
            key={image.id}
            className="relative h-54 w-36 md:h-96 md:w-64"
          >
            <img
              src={image.src}
              alt={image.alt}
              className="pointer-events-none absolute h-full w-full object-cover"
            />
          </GridItem>
        ))}
      </GridBody>
    </DraggableContainer>
  );
};

export default InfiniteGrid;
