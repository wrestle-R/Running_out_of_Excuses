import React, { useState } from 'react';
import { 
  GridBody,
  DraggableContainer,
  GridItem, 
} from "./ui/infinite-drag-scroll";

const runningImages = [
  /* {
    id: 1,
    alt: "Morning Run",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432188/1_mdhq5f.jpg",
    desc: "Clare(Clear) Road.",
  }, */
  {
    id: 2,
    alt: "Trail Adventure",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432183/2_lx6d65.jpg",
    desc: "One of the Kanyakumari Beaches.",
  },
  {
    id: 3,
    alt: "City Marathon",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/3_pu3pw9.jpg",
    desc: "Who gonna carry the boats!!",
  },
  /* {
    id: 4,
    alt: "Training Day",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/4_l532dq.jpg",
    desc: "I love Beaches.",
  }, */
  {
    id: 5,
    alt: "Blue hour",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/5_lrl7lw.jpg",
    desc: "The BLUE hour.",
  },
  /* {
    id: 6,
    alt: "Group Run",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/6_k2eque.jpg",
    desc: "Hanging bridge Kanyakumari.",
  }, */
  {
    id: 7,
    alt: "Recovery",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/7_mncp5f.jpg",
    desc: "Elevated Nature Trail.",
  },
  {
    id: 8,
    alt: "Mountain Trail",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/8_hewv9v.jpg",
    desc: "Jean Baptiste Garden.",
  },
  /* {
    id: 9,
    alt: "Victory Moment",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432187/9_ubd6ea.jpg",
    desc: "Walk-Talk Marines.",
  }, */
  {
    id: 10,
    alt: "Morning Run 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
    desc: "Karungal Church.",
  },
  /* {
    id: 11,
    alt: "Trail Adventure 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
    desc: "Karungal roads.",
  }, */
  {
    id: 12,
    alt: "City Marathon 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
    desc: "City streets.",
  },
  {
    id: 13,
    alt: "Training Day 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432197/13_ke9xps.jpg",
    desc: "The grass is the greenest where you water it.",
  },
  /* {
    id: 14,
    alt: "Long Run 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/14_pvhemv.jpg",
    desc: "My KOM(King of the Mountain).",
  }, */
  /* {
    id: 15,
    alt: "Group Run 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432191/15_pkt5y4.jpg",
    desc: "Mornings in RaceCourse>>.",
  }, */
  {
    id: 16,
    alt: "Recovery 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432193/16_pwiik2.jpg",
    desc: "Mumbai Pretty Sometimes.",
  },
  {
    id: 17,
    alt: "Mountain Trail 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432192/17_astwir.jpg",
    desc: "West Coastss.",
  },
  {
    id: 18,
    alt: "Victory Moment 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/18_g8d7b6.jpg",
    desc: "MUNNAAARR.",
  },
  /* {
    id: 19,
    alt: "Morning Run 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/19_qghitb.jpg",
    desc: "Altitude of 6000.",
  }, */
  /* {
    id: 20,
    alt: "Trail Adventure 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432187/20_x8ps41.jpg",
    desc: "Robinson.",
  }, */
  {
    id: 21,
    alt: "City Marathon 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/21_qew9o1.jpg",
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
            className={`relative h-44 w-32 md:h-80 md:w-56 transition-all duration-500 ease-out
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
