import React, { useState } from 'react';
import { 
  GridBody,
  DraggableContainer,
  GridItem, 
} from "./ui/infinite-drag-scroll";

const runningImages = [
  {
    id: 0,
    alt: "Trail Adventure",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432183/2_lx6d65.jpg",
    desc: "One of the Kanyakumari Beaches.",
  },
  {
    id: 1,
    alt: "City Marathon",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/3_pu3pw9.jpg",
    desc: "Who gonna carry the boats son!",
  },
  {
    id: 2,
    alt: "Blue hour",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/5_lrl7lw.jpg",
    desc: "The BLUE hour.",
  },
  {
    id: 3,
    alt: "Recovery",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/7_mncp5f.jpg",
    desc: "Elevated Nature Trail.",
  },
  {
    id: 4,
    alt: "Mountain Trail",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/8_hewv9v.jpg",
    desc: "Jean Baptiste Garden.",
  },
  {
    id: 5,
    alt: "Morning Run 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432189/10_okbnnl.jpg",
    desc: "Karungal Church.",
  },
  {
    id: 6,
    alt: "City Marathon 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/12_uyvcqs.jpg",
    desc: "City streets.",
  },
  {
    id: 7,
    alt: "Training Day 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432197/13_ke9xps.jpg",
    desc: "The grass is the greenest where you water it.",
  },
  {
    id: 8,
    alt: "Recovery 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432193/16_pwiik2.jpg",
    desc: "Mumbai Pretty Sometimes.",
  },
  {
    id: 9,
    alt: "Mountain Trail 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432192/17_astwir.jpg",
    desc: "West Coastss.",
  },
  {
    id: 10,
    alt: "Victory Moment 2",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/18_g8d7b6.jpg",
    desc: "MUNNAAARR.",
  },
  {
    id: 11,
    alt: "City Marathon 3",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/21_qew9o1.jpg",
    desc: "Local Legend who.",
  },
  /* Commented images below */
  {
    id: 12,
    alt: "Morning Run",
    src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432188/1_mdhq5f.jpg",
    desc: "Clare(Clear) Road.",
  },
  // {
  //   id: 13,
  //   alt: "Training Day",
  //   src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432185/4_l532dq.jpg",
  //   desc: "I love Beaches.",
  // },
  // {
  //   id: 14,
  //   alt: "Group Run",
  //   src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/6_k2eque.jpg",
  //   desc: "Hanging bridge Kanyakumari.",
  // },
  // {
  //   id: 15,
  //   alt: "Victory Moment",
  //   src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432187/9_ubd6ea.jpg",
  //   desc: "Walk-Talk Marines.",
  // },
  // {
  //   id: 16,
  //   alt: "Trail Adventure 2",
  //   src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/11_vrvoqc.jpg",
  //   desc: "Karungal roads.",
  // },
  // {
  //   id: 17,
  //   alt: "Long Run 2",
  //   src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432190/14_pvhemv.jpg",
  //   desc: "My KOM(King of the Mountain).",
  // },
  // {
  //   id: 18,
  //   alt: "Group Run 2",
  //   src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432191/15_pkt5y4.jpg",
  //   desc: "Mornings in RaceCourse>>.",
  // },
  // {
  //   id: 19,
  //   alt: "Morning Run 3",
  //   src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432186/19_qghitb.jpg",
  //   desc: "Altitude of 6000.",
  // },
  // {
  //   id: 20,
  //   alt: "Trail Adventure 3",
  //   src: "https://res.cloudinary.com/dvti0xrsg/image/upload/v1765432187/20_x8ps41.jpg",
  //   desc: "Robinson.",
  // },
];

const InfiniteGrid = () => {
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
    const totalSlots = 60;
    
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
      
      // Pick a random candidate
      // Use a consistent seeded-like randomness to avoid hydration mismatches if possible, 
      // but simple math random is fine for client-side only. 
      // Using a simple pseudo-random based on index to be deterministic.
      const seed = (i * 9301 + 49297) % 233280;
      const choiceIndex = Math.floor((seed / 233280) * candidates.length);
      const choice = candidates[choiceIndex];
      
      result.push({
        ...choice,
        id: i * 100, // Unique ID for key
        originalId: choice.id
      });
    }
    
    return result;
  };

  // Use useMemo ensures we don't regenerate on every render
  const extendedImages = React.useMemo(() => createDiverseSet(), []);

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
