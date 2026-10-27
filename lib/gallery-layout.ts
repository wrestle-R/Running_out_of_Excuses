type GalleryImage = { id: string; src: string; alt: string; desc: string };

// Match GridBody's six columns. The repeated panels wrap at their edges, so
// compare neighbours across those edges as well as inside the panel.
export function arrangeGallery(images: GalleryImage[], seed: number) {
  const unique = [...new Map(images.filter(image => image.src).map(image => [image.src, image])).values()];
  if (!unique.length) return [];
  const columns = 6;
  const slots = Math.ceil(Math.max(60, unique.length) / columns) * columns;
  const rows = slots / columns;
  const layout: number[] = [];
  const counts = unique.map(() => 0);
  let state = seed >>> 0;
  const random = () => {
    state += 0x6D2B79F5;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const neighbours = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const moreSpace = [[-2, 0], [2, 0], [0, -2], [0, 2]];

  for (let slot = 0; slot < slots; slot++) {
    const row = Math.floor(slot / columns);
    const column = slot % columns;
    const occupied = (offsets: number[][]) => new Set(offsets.map(([dx, dy]) => {
      const other = ((row + dy + rows) % rows) * columns + (column + dx + columns) % columns;
      return layout[other];
    }).filter(index => index !== undefined));
    const close = occupied(neighbours);
    const nearby = occupied([...neighbours, ...moreSpace]);
    let candidates = unique.map((_, index) => index).filter(index => !nearby.has(index));
    if (!candidates.length) candidates = unique.map((_, index) => index).filter(index => !close.has(index));
    if (!candidates.length) candidates = unique.map((_, index) => index);

    // Use every available photo before repeating, then keep repeats balanced.
    const fewest = Math.min(...candidates.map(index => counts[index]));
    candidates = candidates.filter(index => counts[index] === fewest);
    const choice = candidates[Math.floor(random() * candidates.length)];
    layout.push(choice);
    counts[choice]++;
  }

  return layout.map((index, slot) => ({ ...unique[index], slotId: slot }));
}
