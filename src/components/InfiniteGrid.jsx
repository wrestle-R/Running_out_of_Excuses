import React, { useState } from 'react';
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
    desc: "Clare(Clear) Road.",
  },
  {
    id: 2,
    alt: "Trail Adventure",
    src: "/2.jpg",
    desc: "One of the Kanyakumari Beaches.",
  },
  {
    id: 3,
    alt: "City Marathon",
    src: "/3.jpg",
    desc: "Who gonna carry the boats!!",
  },
  {
    id: 4,
    alt: "Training Day",
    src: "/4.jpg",
    desc: "I love Beaches.",
  },
  {
    id: 5,
    alt: "Blue hour",
    src: "/5.jpg",
    desc: "The BLUE hour.",
  },
  {
    id: 6,
    alt: "Group Run",
    src: "/6.jpg",
    desc: "Hanging bridge Kanyakumari.",
  },
  {
    id: 7,
    alt: "Recovery",
    src: "/7.jpg",
    desc: "Elevated Nature Trail.",
  },
  {
    id: 8,
    alt: "Mountain Trail",
    src: "/8.jpg",
    desc: "Jean Baptiste Garden.",
  },
  {
    id: 9,
    alt: "Victory Moment",
    src: "/9.jpg",
    desc: "Walk-Talk Marines.",
  },
  {
    id: 10,
    alt: "Morning Run 2",
    src: "/10.jpg",
    desc: "Karungal Church.",
  },
  {
    id: 11,
    alt: "Trail Adventure 2",
    src: "/11.jpg",
    desc: "Karungal roads.",
  },
  {
    id: 12,
    alt: "City Marathon 2",
    src: "/12.jpg",
    desc: "City streets.",
  },
  {
    id: 13,
    alt: "Training Day 2",
    src: "/13.jpg",
    desc: "The grass is the greenest where you water it.",
  },
  {
    id: 14,
    alt: "Long Run 2",
    src: "/14.jpg",
    desc: "My KOM(King of the Mountain).",
  },
  {
    id: 15,
    alt: "Group Run 2",
    src: "/15.jpg",
    desc: "Mornings in RaceCourse>>.",
  },
  {
    id: 16,
    alt: "Recovery 2",
    src: "/16.jpg",
    desc: "Mumbai Pretty Sometimes.",
  },
  {
    id: 17,
    alt: "Mountain Trail 2",
    src: "/17.jpg",
    desc: "West Coastss.",
  },
  {
    id: 18,
    alt: "Victory Moment 2",
    src: "/18.jpg",
    desc: "MUNNAAARR.",
  },
  {
    id: 19,
    alt: "Morning Run 2",
    src: "/19.jpg",
    desc: "Altitude of 6000.",
  },
  {
    id: 20,
    alt: "Trail Adventure 2",
    src: "/20.jpg",
    desc: "Robinson.",
  },
  {
    id: 21,
    alt: "City Marathon 2",
    src: "/21.jpg",
    desc: "Local Legend who.",
  },
];

const InfiniteGrid = () => {
  const [hoveredId, setHoveredId] = useState(null);

  const handleMouseEnter = (id) => {
    setHoveredId(id);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
  };

  return (
    <DraggableContainer variant="masonry">
      <GridBody>
        {runningImages.map((image) => (
          <GridItem
            key={image.id}
            className={`relative h-54 w-36 md:h-96 md:w-64 transition-all duration-500 ease-out
              ${hoveredId !== null && hoveredId !== image.id ? "blur-[2px] brightness-50 scale-95" : ""}
              ${hoveredId === image.id ? "scale-110 z-30" : ""}
            `}
            onMouseEnter={() => handleMouseEnter(image.id)}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="pointer-events-none absolute h-full w-full object-cover rounded"
              draggable={false}
            />
            {hoveredId === image.id && (
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-transparent to-transparent rounded transition-all duration-300">
                <span className="text-white text-sm md:text-base font-medium p-3 md:p-4 text-center w-full">
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
