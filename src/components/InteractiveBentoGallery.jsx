import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import PhoneCardStack from "./PhoneCardStack";
import MediaItem from "./MediaItem";

const GalleryModal = ({
  selectedItem,
  isOpen,
  onClose,
  setSelectedItem,
  mediaItems,
}) => {
  const [dockPosition, setDockPosition] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <motion.div
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.98 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
        className="fixed inset-0 w-full min-h-screen sm:h-[90vh] md:h-[600px] backdrop-blur-lg bg-black/80 rounded-none sm:rounded-lg md:rounded-xl overflow-hidden z-40"
      >
        {/* Main Content */}
        <div className="h-full flex flex-col">
          <div className="flex-1 p-2 sm:p-3 md:p-4 flex items-center justify-center bg-black/80">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedItem.id}
                className="relative w-full aspect-[16/9] max-w-[95%] sm:max-w-[85%] md:max-w-3xl h-auto max-h-[70vh] rounded-lg overflow-hidden shadow-md"
                initial={{ y: 20, scale: 0.97 }}
                animate={{
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    mass: 0.5,
                  },
                }}
                exit={{
                  y: 20,
                  scale: 0.97,
                  transition: { duration: 0.15 },
                }}
                onClick={onClose}
              >
                <MediaItem
                  item={selectedItem}
                  className="w-full h-full object-contain bg-black/80"
                  onClick={onClose}
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4 bg-gradient-to-t from-black/50 to-transparent">
                  <h3 className="text-white text-base sm:text-lg md:text-xl font-semibold">
                    {selectedItem.title}
                  </h3>
                  <p className="text-white/80 text-xs sm:text-sm mt-1">
                    {selectedItem.desc}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Close Button */}
        <motion.button
          className="absolute top-2 sm:top-2.5 md:top-3 right-2 sm:right-2.5 md:right-3 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 text-xs sm:text-sm backdrop-blur-sm"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Draggable Dock */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        initial={false}
        animate={{ x: dockPosition.x, y: dockPosition.y }}
        onDragEnd={(_, info) => {
          setDockPosition((prev) => ({
            x: prev.x + info.offset.x,
            y: prev.y + info.offset.y,
          }));
        }}
        className="fixed z-50 left-1/2 bottom-4 -translate-x-1/2 touch-none"
      >
        <motion.div className="relative rounded-xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-lg cursor-grab active:cursor-grabbing">
          <div className="flex items-center -space-x-2 px-3 py-2">
            {mediaItems.map((item, index) => (
              <motion.div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                }}
                style={{
                  zIndex:
                    selectedItem.id === item.id
                      ? 30
                      : mediaItems.length - index,
                }}
                className={`
                  relative group
                  w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex-shrink-0 
                  rounded-lg overflow-hidden 
                  cursor-pointer hover:z-20
                  ${
                    selectedItem.id === item.id
                      ? "ring-2 ring-white/70 shadow-lg"
                      : "hover:ring-2 hover:ring-white/30"
                  }
                `}
                initial={{ rotate: index % 2 === 0 ? -15 : 15 }}
                animate={{
                  scale: selectedItem.id === item.id ? 1.2 : 1,
                  rotate:
                    selectedItem.id === item.id
                      ? 0
                      : index % 2 === 0
                      ? -15
                      : 15,
                  y: selectedItem.id === item.id ? -8 : 0,
                }}
                whileHover={{
                  scale: 1.3,
                  rotate: 0,
                  y: -10,
                  transition: { type: "spring", stiffness: 400, damping: 25 },
                }}
              >
                <MediaItem
                  item={item}
                  className="w-full h-full"
                  onClick={() => setSelectedItem(item)}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/20" />
                {selectedItem.id === item.id && (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute -inset-2 bg-white/20 blur-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

const InteractiveBentoGallery = ({
  mediaItems,
  title,
  description,
  onGalleryModalToggle,
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [items, setItems] = useState(mediaItems);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const check = () => setIsPhone(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Notify parent when modal opens/closes
  useEffect(() => {
    if (typeof onGalleryModalToggle === "function") {
      onGalleryModalToggle(!!selectedItem);
    } else {
      // Fallback: dispatch a custom event for global listening
      window.dispatchEvent(
        new CustomEvent("gallery-modal-toggle", { detail: !!selectedItem })
      );
    }
  }, [selectedItem, onGalleryModalToggle]);

  if (isPhone) {
    return (
      <PhoneCardStack
        mediaItems={mediaItems}
        title={title}
        description={description}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl mb-10">
      <div className="mb-8 text-center">
        <motion.h1
          className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent 
                             bg-gradient-to-r from-white via-white/80 to-white/60"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="mt-2 text-sm sm:text-base text-white/70"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {description}
        </motion.p>
      </div>

      <AnimatePresence mode="wait">
        {selectedItem ? (
          <GalleryModal
            selectedItem={selectedItem}
            isOpen={true}
            onClose={() => setSelectedItem(null)}
            setSelectedItem={setSelectedItem}
            mediaItems={items}
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 auto-rows-[200px] sm:auto-rows-[120px] md:auto-rows-[140px]"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
              },
            }}
          >
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                layoutId={`media-${item.id}`}
                className={`relative overflow-hidden rounded-xl cursor-grab active:cursor-grabbing ${item.span} flex`}
                style={{
                  zIndex: draggedIndex === index ? 50 : 1,
                }}
                onClick={() => !isDragging && setSelectedItem(item)}
                variants={{
                  hidden: { y: 50, scale: 0.9, opacity: 0 },
                  visible: {
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    transition: {
                      type: "spring",
                      stiffness: 350,
                      damping: 25,
                      delay: index * 0.05,
                    },
                  },
                }}
                whileHover={{ 
                  scale: draggedIndex === null ? 1.02 : 1,
                  transition: { duration: 0.2 }
                }}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.2}
                dragMomentum={false}
                onDragStart={() => {
                  setIsDragging(true);
                  setDraggedIndex(index);
                }}
                onDragEnd={(e, info) => {
                  setIsDragging(false);
                  setDraggedIndex(null);
                  
                  const threshold = 80;
                  const moveDistanceX = info.offset.x;
                  const moveDistanceY = info.offset.y;
                  
                  if (window.innerWidth < 640) {
                    // Mobile: only vertical movement
                    if (Math.abs(moveDistanceY) > threshold) {
                      const newItems = [...items];
                      const draggedItem = newItems[index];
                      const targetIndex = moveDistanceY > 0
                        ? Math.min(index + 1, items.length - 1)
                        : Math.max(index - 1, 0);
                      
                      if (targetIndex !== index) {
                        newItems.splice(index, 1);
                        newItems.splice(targetIndex, 0, draggedItem);
                        setItems(newItems);
                      }
                    }
                  } else {
                    // Desktop/tablet: horizontal and vertical movement
                    if (Math.abs(moveDistanceX) > threshold || Math.abs(moveDistanceY) > threshold) {
                      const newItems = [...items];
                      const draggedItem = newItems[index];
                      let targetIndex = index;
                      
                      if (Math.abs(moveDistanceX) > Math.abs(moveDistanceY)) {
                        // Horizontal movement
                        targetIndex = moveDistanceX > 0
                          ? Math.min(index + 1, items.length - 1)
                          : Math.max(index - 1, 0);
                      } else {
                        // Vertical movement (by grid rows)
                        const cols = window.innerWidth >= 768 ? 4 : 3;
                        targetIndex = moveDistanceY > 0
                          ? Math.min(index + cols, items.length - 1)
                          : Math.max(index - cols, 0);
                      }
                      
                      if (targetIndex !== index) {
                        newItems.splice(index, 1);
                        newItems.splice(targetIndex, 0, draggedItem);
                        setItems(newItems);
                      }
                    }
                  }
                }}
                animate={{
                  scale: draggedIndex === index ? 1.05 : 1,
                  opacity: draggedIndex !== null && draggedIndex !== index ? 0.7 : 1,
                }}
                transition={{
                  scale: { duration: 0.2 },
                  opacity: { duration: 0.2 }
                }}
              >
                <MediaItem
                  item={item}
                  className="absolute inset-0 w-full h-full"
                  onClick={() => !isDragging && setSelectedItem(item)}
                />
                <motion.div
                  className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 md:p-4"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: draggedIndex === null ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <h3 className="relative text-white text-xs sm:text-sm md:text-base font-medium line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="relative text-white/70 text-[10px] sm:text-xs md:text-sm mt-0.5 line-clamp-2">
                    {item.desc}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InteractiveBentoGallery;
